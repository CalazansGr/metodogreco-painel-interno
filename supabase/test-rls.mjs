// Testa as regras de segurança (RLS) do schema.sql num Postgres local (PGlite),
// simulando o ambiente do Supabase. Rode com: npm run test:rls
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
`);
await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
await db.exec('grant select on all tables in schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;');

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(`${cond ? '  ok ' : ' FALHOU'}  ${name}`); };

async function as(uid, fn) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const rows = async (sql, p = []) => (await db.query(sql, p)).rows;
const fails = async (sql, p = []) => { try { await db.query(sql, p); return null; } catch (e) { return e.message; } };

async function mkUser(email, role, name) {
  const { rows: [u] } = await db.query('insert into auth.users(email, raw_user_meta_data) values ($1, $2) returning id', [email, JSON.stringify({ name })]);
  if (role !== 'none') await db.query('update profiles set role=$1, name=$2 where id=$3', [role, name, u.id]);
  return u.id;
}

// ----- Dados -----
const admin = await mkUser('admin@t.com', 'admin', 'Admin');
const teacher = await mkUser('prof@t.com', 'teacher', 'Prof Ana');
const teacher2 = await mkUser('prof2@t.com', 'teacher', 'Prof Bia');
const famA = await mkUser('a@t.com', 'family', 'Família A');
const famB = await mkUser('b@t.com', 'family', 'Família B');
const nobody = await mkUser('x@t.com', 'none', 'Intruso');
check('cadastro novo nasce com role none', (await rows("select role from profiles where id=$1", [nobody]))[0].role === 'none');

const { rows: [sA] } = await db.query("insert into students(family_id,name) values ($1,'Aluno A') returning id", [famA]);
const { rows: [sB] } = await db.query("insert into students(family_id,name) values ($1,'Aluno B') returning id", [famB]);
await db.query("insert into guardians(family_id,name) values ($1,'Mãe A'),($2,'Mãe B')", [famA, famB]);
await db.query("insert into payments(student_id,credits,amount_cents) values ($1,4,40000),($2,4,40000)", [sA.id, sB.id]);

const d = new Date(Date.now() + 3 * 86400000);
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const dow = new Date(`${ymd}T12:00:00-03:00`).getUTCDay();
await db.query("insert into availability(teacher_id,weekday,start_time,end_time) values ($1,$2,'14:00','18:00')", [teacher, dow]);
const at = (h) => `${ymd}T${h}:00-03:00`;

// ----- Sem papel / anônimo -----
console.log('\nUsuário sem papel e anônimo');
check('sem papel não vê alunos', (await as(nobody, () => rows('select * from students'))).length === 0);
check('sem papel não vê professores', (await as(nobody, () => rows("select * from profiles where role='teacher'"))).length === 0);
check('sem papel vê só o próprio perfil', (await as(nobody, () => rows('select * from profiles'))).length === 1);
check('sem papel não consegue agendar', !!(await as(nobody, () => fails('select book_lesson($1,$2,$3)', [sA.id, teacher, at('15:00')]))));
await db.exec('set role anon');
check('anônimo não lê tabelas', !!(await fails('select * from students')));
check('anônimo não executa book_lesson', !!(await fails('select book_lesson(1, gen_random_uuid(), now())')));
check('anônimo executa ping()', (await fails('select ping()')) === null);
await db.exec('reset role');

// ----- Família -----
console.log('\nFamília');
check('família A vê só o aluno A', JSON.stringify((await as(famA, () => rows('select name from students'))).map(r => r.name)) === '["Aluno A"]');
check('família A vê só seus pagamentos', (await as(famA, () => rows('select * from payments'))).length === 1);
check('família A vê só seus responsáveis', (await as(famA, () => rows('select * from guardians'))).length === 1);
check('família vê os professores', (await as(famA, () => rows("select * from profiles where role='teacher'"))).length === 2);
check('família NÃO vê perfis de outras famílias', (await as(famA, () => rows("select * from profiles where role='family'"))).length === 1);
check('família não registra pagamento', !!(await as(famA, () => fails('insert into payments(student_id,credits) values ($1,10)', [sA.id]))));
check('família não edita aluno', (await as(famA, async () => (await db.query("update students set level='X' where id=$1", [sA.id])).affectedRows)) === 0);
check('família não vira admin', (await as(famA, async () => (await db.query("update profiles set role='admin' where id=$1", [famA])).affectedRows)) === 0);
check('família não insere aula direto', !!(await as(famA, () => fails("insert into lessons(student_id,teacher_id,starts_at) values ($1,$2,now())", [sA.id, teacher]))));

const lessonId = await as(famA, async () => (await rows('select book_lesson($1,$2,$3) as id', [sA.id, teacher, at('15:00')]))[0].id);
check('família agenda dentro da disponibilidade', !!lessonId);
check('família não agenda aluno de outra família', !!(await as(famA, () => fails('select book_lesson($1,$2,$3)', [sB.id, teacher, at('16:00')]))));
check('conflito de horário é bloqueado', !!(await as(famB, () => fails('select book_lesson($1,$2,$3)', [sB.id, teacher, at('15:00')]))));
check('fora da disponibilidade é bloqueado', !!(await as(famB, () => fails('select book_lesson($1,$2,$3)', [sB.id, teacher, at('19:00')]))));
check('professor sem disponibilidade é bloqueado', !!(await as(famB, () => fails('select book_lesson($1,$2,$3)', [sB.id, teacher2, at('15:00')]))));
check('horário passado é bloqueado', !!(await as(famB, () => fails("select book_lesson($1,$2,now() - interval '1 day')", [sB.id, teacher]))));
check('família B não vê aula da família A', (await as(famB, () => rows('select * from lessons'))).length === 0);
check('busy_slots mostra horário ocupado', (await as(famB, () => rows('select * from busy_slots($1, now(), now() + interval \'10 days\')', [teacher]))).length === 1);
check('família cancela com antecedência', (await as(famA, async () => { await db.query("select set_lesson_status($1,'cancelada')", [lessonId]); return rows('select status from lessons where id=$1', [lessonId]); }))[0].status === 'cancelada');
check('família não marca aula como realizada', !!(await as(famA, () => fails("select set_lesson_status($1,'realizada')", [lessonId]))));
await db.query("insert into lessons(student_id,teacher_id,starts_at) values ($1,$2, now() + interval '30 minutes')", [sA.id, teacher]);
const soon = (await rows("select id from lessons where starts_at < now() + interval '1 hour'"))[0].id;
check('cancelamento < 2h é bloqueado', !!(await as(famA, () => fails("select set_lesson_status($1,'cancelada')", [soon]))));

// ----- Professor -----
console.log('\nProfessor');
await db.query("update lessons set status='agendada' where id=$1", [lessonId]);
check('professor vê só suas aulas', (await as(teacher, () => rows('select * from lessons'))).length === 2);
check('professor 2 não vê aulas do professor 1', (await as(teacher2, () => rows('select * from lessons'))).length === 0);
check('professor vê só alunos com quem tem aula', (await as(teacher, () => rows('select * from students'))).length === 1);
check('professor 2 não vê alunos', (await as(teacher2, () => rows('select * from students'))).length === 0);
check('professor não vê pagamentos', (await as(teacher, () => rows('select * from payments'))).length === 0);
check('professor escreve nota do seu aluno', (await as(teacher, () => fails("insert into student_notes(student_id,teacher_id,content) values ($1,$2,'ok')", [sA.id, teacher]))) === null);
check('professor NÃO escreve nota de aluno alheio', !!(await as(teacher, () => fails("insert into student_notes(student_id,teacher_id,content) values ($1,$2,'x')", [sB.id, teacher]))));
check('professor marca sua aula como realizada', (await as(teacher, async () => { await db.query("select set_lesson_status($1,'realizada')", [lessonId]); return rows('select status from lessons where id=$1', [lessonId]); }))[0].status === 'realizada');
check('professor 2 não altera aula alheia', !!(await as(teacher2, () => fails("select set_lesson_status($1,'faltou')", [lessonId]))));
check('professor atualiza nível do seu aluno', (await as(teacher, () => fails("select teacher_update_student($1,'Aventura','meta')", [sA.id]))) === null);
check('professor NÃO atualiza aluno alheio', !!(await as(teacher, () => fails("select teacher_update_student($1,'x','y')", [sB.id]))));
check('professor não agenda', !!(await as(teacher, () => fails('select book_lesson($1,$2,$3)', [sA.id, teacher, at('17:00')]))));

// ----- Notas ocultas -----
console.log('\nNotas');
await db.query("insert into student_notes(student_id,teacher_id,content,visible_to_family) values ($1,$2,'interna',false)", [sA.id, teacher]);
check('família não vê nota interna', (await as(famA, () => rows('select * from student_notes'))).every(n => n.visible_to_family));
check('professor vê nota interna', (await as(teacher, () => rows('select * from student_notes'))).length === 2);

// ----- Dados internos (planilha) -----
console.log('\nDados internos do admin (student_admin)');
await db.query("insert into student_admin(student_id, phone, price_cents, obs) values ($1,'21 99999', 7000, 'pediu desconto')", [sA.id]);
check('família NÃO lê preço/observações internas', (await as(famA, () => rows('select * from student_admin'))).length === 0);
check('professor NÃO lê dados internos', (await as(teacher, () => rows('select * from student_admin'))).length === 0);
check('família NÃO escreve dados internos', !!(await as(famA, () => fails("insert into student_admin(student_id) values ($1)", [sB.id]))));
check('admin lê dados internos', (await as(admin, () => rows('select * from student_admin'))).length === 1);
check('admin grava dados internos', (await as(admin, () => fails("insert into student_admin(student_id, price_cents) values ($1, 6500)", [sB.id]))) === null);
check('pagamento aceita meia hora (8,5)', (await as(admin, () => fails('insert into payments(student_id,credits) values ($1, 8.5)', [sA.id]))) === null);

// ----- Admin -----
console.log('\nAdmin');
check('admin vê todos os alunos', (await as(admin, () => rows('select * from students'))).length === 2);
check('admin vê todos os pagamentos', (await as(admin, () => rows('select * from payments'))).length === 3);
check('admin registra pagamento', (await as(admin, () => fails('insert into payments(student_id,credits) values ($1,4)', [sA.id]))) === null);
check('admin agenda (WhatsApp) mesmo fora da disponibilidade', (await as(admin, () => fails("select book_lesson($1,$2,$3,60,'x','whatsapp')", [sB.id, teacher, at('20:00')]))) === null);
check('admin muda papel de usuário', (await as(admin, async () => (await db.query("update profiles set role='teacher' where id=$1", [nobody])).affectedRows)) === 1);

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
