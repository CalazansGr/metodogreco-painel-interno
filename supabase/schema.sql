-- =====================================================================
-- Método Greco — esquema do banco + segurança (RLS) para o Supabase
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- Pode rodar de novo com segurança (é idempotente na maior parte).
-- =====================================================================

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'none' check (role in ('none','admin','teacher','family')),
  name text not null default '',
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guardians (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text,
  phone text
);

create table if not exists public.students (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  birth_date date,
  school text,
  grade text,
  level text,
  goals text,
  health_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  duration_min int not null default 60,
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada','faltou')),
  source text not null default 'site' check (source in ('site','whatsapp','admin')),
  topic text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists lessons_starts_idx on public.lessons(starts_at);
create index if not exists lessons_teacher_idx on public.lessons(teacher_id, starts_at);
create index if not exists lessons_student_idx on public.lessons(student_id, starts_at);

create table if not exists public.student_notes (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  teacher_id uuid references public.profiles(id),
  lesson_id bigint references public.lessons(id) on delete set null,
  content text not null,
  visible_to_family boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  credits int not null check (credits > 0),
  amount_cents int not null default 0 check (amount_cents >= 0),
  method text,
  note text,
  paid_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- Perfil criado automaticamente a cada cadastro ----------
-- IMPORTANTE: todo cadastro novo nasce com role 'none' (sem acesso a nada).
-- Só o administrador consegue mudar o papel de alguém.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''), 'none')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funções auxiliares (usadas nas políticas) ----------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin','teacher','family'), false)
$$;

create or replace function public.owns_student(sid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'family', false)
     and exists (select 1 from public.students s where s.id = sid and s.family_id = auth.uid())
$$;

create or replace function public.teaches_student(sid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'teacher', false)
     and exists (select 1 from public.lessons l where l.student_id = sid and l.teacher_id = auth.uid())
$$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.guardians enable row level security;
alter table public.students enable row level security;
alter table public.availability enable row level security;
alter table public.lessons enable row level security;
alter table public.student_notes enable row level security;
alter table public.payments enable row level security;

-- profiles: cada um vê o próprio; admin vê todos; membros veem os professores
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or (role = 'teacher' and active and public.is_member()));
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- guardians
drop policy if exists guardians_select on public.guardians;
create policy guardians_select on public.guardians for select to authenticated using (
  public.is_admin()
  or (public.app_role() = 'family' and family_id = auth.uid())
  or (public.app_role() = 'teacher' and exists (
        select 1 from public.students s where s.family_id = guardians.family_id and public.teaches_student(s.id)))
);
drop policy if exists guardians_admin_write on public.guardians;
create policy guardians_admin_write on public.guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students
drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated using (
  public.is_admin() or public.owns_student(id) or public.teaches_student(id)
);
drop policy if exists students_admin_write on public.students;
create policy students_admin_write on public.students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- availability: membros leem; admin ou o próprio professor escrevem
drop policy if exists availability_select on public.availability;
create policy availability_select on public.availability for select to authenticated using (public.is_member());
drop policy if exists availability_write on public.availability;
create policy availability_write on public.availability for all to authenticated
  using (public.is_admin() or (public.app_role() = 'teacher' and teacher_id = auth.uid()))
  with check (public.is_admin() or (public.app_role() = 'teacher' and teacher_id = auth.uid()));

-- lessons: só leitura direta; toda escrita passa pelas funções abaixo
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to authenticated using (
  public.is_admin()
  or (public.app_role() = 'teacher' and teacher_id = auth.uid())
  or public.owns_student(student_id)
);

-- student_notes
drop policy if exists notes_select on public.student_notes;
create policy notes_select on public.student_notes for select to authenticated using (
  public.is_admin() or public.teaches_student(student_id)
  or (visible_to_family and public.owns_student(student_id))
);
drop policy if exists notes_insert on public.student_notes;
create policy notes_insert on public.student_notes for insert to authenticated with check (
  public.is_admin() or (public.teaches_student(student_id) and teacher_id = auth.uid())
);
drop policy if exists notes_admin_delete on public.student_notes;
create policy notes_admin_delete on public.student_notes for delete to authenticated using (public.is_admin());

-- payments: família lê os do próprio aluno; só admin escreve
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (public.is_admin() or public.owns_student(student_id));
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Funções (RPC) para escrever aulas com segurança ----------
create or replace function public.book_lesson(
  p_student bigint, p_teacher uuid, p_starts timestamptz,
  p_duration int default 60, p_topic text default null, p_source text default 'site')
returns bigint language plpgsql security definer set search_path = public as $$
declare
  r text := public.app_role();
  src text;
  l_start timestamp;
  l_end timestamp;
  ok boolean;
  new_id bigint;
begin
  if r is null or r not in ('admin','family') then raise exception 'Sem permissão para agendar.'; end if;
  if not exists (select 1 from public.students where id = p_student and active) then raise exception 'Aluno não encontrado.'; end if;
  if r = 'family' then
    if not public.owns_student(p_student) then raise exception 'Sem permissão para este aluno.'; end if;
    src := 'site';
  else
    src := case when p_source = 'whatsapp' then 'whatsapp' else 'admin' end;
  end if;
  if not exists (select 1 from public.profiles where id = p_teacher and role = 'teacher' and active) then raise exception 'Professor inválido.'; end if;
  if p_duration < 15 or p_duration > 240 then raise exception 'Duração inválida.'; end if;
  if p_starts < now() then raise exception 'Esse horário já passou.'; end if;

  if r = 'family' then
    l_start := p_starts at time zone 'America/Sao_Paulo';
    l_end := l_start + make_interval(mins => p_duration);
    select exists (
      select 1 from public.availability a
      where a.teacher_id = p_teacher
        and a.weekday = extract(dow from l_start)::int
        and l_start::time >= a.start_time and l_end::time <= a.end_time
        and l_end::date = l_start::date
    ) into ok;
    if not ok then raise exception 'Esse horário não está na agenda do professor.'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('greco-lessons'));
  if exists (
    select 1 from public.lessons x
    where x.status in ('agendada','realizada')
      and (x.teacher_id = p_teacher or x.student_id = p_student)
      and x.starts_at < p_starts + make_interval(mins => p_duration)
      and x.starts_at + make_interval(mins => x.duration_min) > p_starts
  ) then
    raise exception 'Horário indisponível: já existe uma aula nesse período para o professor ou para o aluno.';
  end if;

  insert into public.lessons(student_id, teacher_id, starts_at, duration_min, source, topic, created_by)
  values (p_student, p_teacher, p_starts, p_duration, src, nullif(trim(p_topic), ''), auth.uid())
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.set_lesson_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  l public.lessons%rowtype;
  r text := public.app_role();
begin
  if p_status not in ('agendada','realizada','cancelada','faltou') then raise exception 'Status inválido.'; end if;
  select * into l from public.lessons where id = p_id;
  if not found then raise exception 'Aula não encontrada.'; end if;
  if r = 'admin' then null;
  elsif r = 'teacher' and l.teacher_id = auth.uid() then null;
  elsif r = 'family' and public.owns_student(l.student_id) then
    if p_status <> 'cancelada' or l.status <> 'agendada' then raise exception 'Você só pode cancelar aulas agendadas.'; end if;
    if l.starts_at - now() < interval '2 hours' then raise exception 'Cancelamento só com 2 horas de antecedência. Fale com a escola.'; end if;
  else
    raise exception 'Sem permissão.';
  end if;
  update public.lessons set status = p_status where id = p_id;
end $$;

-- Horários ocupados de um professor (sem revelar quem é o aluno)
create or replace function public.busy_slots(p_teacher uuid, p_from timestamptz, p_to timestamptz)
returns table(starts_at timestamptz, duration_min int)
language sql stable security definer set search_path = public as $$
  select l.starts_at, l.duration_min from public.lessons l
  where public.is_member() and l.teacher_id = p_teacher and l.status in ('agendada','realizada')
    and l.starts_at >= p_from and l.starts_at < p_to
$$;

create or replace function public.teacher_update_student(p_id bigint, p_level text, p_goals text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.teaches_student(p_id)) then raise exception 'Sem permissão.'; end if;
  update public.students set level = nullif(trim(p_level), ''), goals = nullif(trim(p_goals), '') where id = p_id;
end $$;

-- Usada pela tarefa diária que mantém o projeto "acordado" (plano gratuito)
create or replace function public.ping() returns timestamptz
language sql stable as $$ select now() $$;

-- ---------- Permissões ----------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on function public.book_lesson(bigint, uuid, timestamptz, int, text, text) from public, anon;
revoke all on function public.set_lesson_status(bigint, text) from public, anon;
revoke all on function public.busy_slots(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.teacher_update_student(bigint, text, text) from public, anon;
grant execute on function public.book_lesson(bigint, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function public.set_lesson_status(bigint, text) to authenticated;
grant execute on function public.busy_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.teacher_update_student(bigint, text, text) to authenticated;
grant execute on function public.ping() to anon, authenticated;

-- ---------- Primeiro administrador ----------
-- 1) Crie seu usuário em Authentication > Users (ou cadastre-se pelo site).
-- 2) Rode (trocando o e-mail):
--    update public.profiles set role = 'admin', name = 'Seu Nome' where email = 'seu@email.com';
