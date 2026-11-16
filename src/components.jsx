import { useState } from 'react';
import { Link, NavLink, Outlet, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { q, rpc, useData, getSlots, getBilling, brl, fmtBirth, fmtH } from './lib';
import { fmtDateTime, fmtTime, WEEKDAYS } from './dates';

// ---------- Básicos ----------
export const Alert = ({ children, ok }) => (children ? <div className={`alert ${ok ? 'ok' : ''}`}>{children}</div> : null);
export const Loading = () => <p className="muted">Carregando…</p>;

// Mostra carregando/erro e entrega os dados ao filho
export function Async({ state, children }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <Alert>Erro: {state.error}</Alert>;
  return children(state.data);
}

// Executa uma ação e mostra o erro, se houver
export function useAction() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setError(''); setBusy(true);
    try { await fn(); return true; } catch (e) { setError(e.message || String(e)); return false; } finally { setBusy(false); }
  };
  return { error, busy, run, setError };
}

// ---------- Estrutura ----------
const LINKS = {
  admin: [['/admin', 'Painel', true], ['/admin/planilha', 'Planilha'], ['/admin/aulas', 'Aulas'], ['/admin/alunos', 'Alunos'], ['/admin/familias', 'Famílias'], ['/admin/professores', 'Professores'], ['/admin/pagamentos', 'Pagamentos'], ['/admin/senha', 'Minha senha']],
  teacher: [['/professor', 'Minha agenda', true], ['/professor/disponibilidade', 'Meus horários'], ['/professor/senha', 'Minha senha']],
  guardian: [['/familia', 'Início', true], ['/familia/agendar', 'Agendar aula'], ['/familia/ficha', 'Ficha'], ['/familia/pagamentos', 'Pagamentos'], ['/familia/senha', 'Minha senha'], ['/perfil', 'Trocar perfil']],
  student: [['/familia', 'Início', true], ['/familia/ficha', 'Minha ficha'], ['/perfil', 'Trocar perfil']],
};

// role: 'admin' | 'teacher' | 'family'
export function Guard({ role }) {
  const { profile, loading, mode, signOut } = useAuth();
  if (loading) return <div className="center"><Loading /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to="/" replace />;
  if (role === 'family' && (!mode || mode.uid !== profile.id)) return <Navigate to="/perfil" replace />;
  const key = role === 'family' ? (mode.type === 'guardian' ? 'guardian' : 'student') : role;
  const who = role === 'admin' ? `Admin · ${profile.name}` : role === 'family' && mode.type === 'student' ? `Aluno: ${mode.studentName}` : profile.name;
  return (
    <>
      <header className="topbar">
        <span className="logo">Método <span>Greco</span></span>
        <nav>{LINKS[key].map(([to, label, end]) => <NavLink key={to} to={to} end={!!end}>{label}</NavLink>)}</nav>
        <span className="who">{who}</span>
        <button onClick={signOut}>Sair</button>
      </header>
      <main><Outlet /></main>
    </>
  );
}

// ---------- Aulas ----------
const LABEL = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada', faltou: 'Faltou' };
const SRC = { site: 'Site', whatsapp: 'WhatsApp', admin: 'Admin' };

// mode: 'admin' | 'teacher' | 'family'
export function LessonCard({ l, mode, onChange }) {
  const { error, busy, run } = useAction();
  const set = (status) => run(async () => { await rpc('set_lesson_status', { p_id: l.id, p_status: status }); onChange?.(); });
  const ms = new Date(l.starts_at).getTime() - Date.now();
  const canFamilyCancel = mode === 'family' && l.status === 'agendada' && ms >= 2 * 3600 * 1000;
  const studentLink = mode === 'admin' ? `/admin/alunos/${l.student_id}` : mode === 'teacher' ? `/professor/alunos/${l.student_id}` : null;
  return (
    <div className="card">
      <div className="lesson">
        <div>
          <div className="when">{fmtDateTime(l.starts_at)} <span className={`badge ${l.status}`}>{LABEL[l.status]}</span> {mode !== 'family' && <span className="badge src">{SRC[l.source]}</span>}</div>
          <div>
            {studentLink ? <Link to={studentLink}>{l.student?.name}</Link> : l.student?.name}
            {mode !== 'teacher' && <span className="muted"> · com {l.teacher?.name}</span>}
            <span className="muted"> · {l.duration_min} min</span>
          </div>
          {l.topic && <div className="muted">Assunto: {l.topic}</div>}
        </div>
        <div className="actions">
          {mode !== 'family' && l.status === 'agendada' && (<>
            <button className="btn small ghost" disabled={busy} onClick={() => set('realizada')}>Realizada</button>
            <button className="btn small ghost" disabled={busy} onClick={() => set('faltou')}>Faltou</button>
            <button className="btn small danger" disabled={busy} onClick={() => confirm('Cancelar esta aula?') && set('cancelada')}>Cancelar</button>
          </>)}
          {canFamilyCancel && <button className="btn small danger" disabled={busy} onClick={() => confirm('Cancelar esta aula?') && set('cancelada')}>Cancelar aula</button>}
          {mode === 'family' && l.status === 'agendada' && ms > 0 && !canFamilyCancel && <span className="muted">Para cancelar, fale com a escola.</span>}
        </div>
      </div>
      <Alert>{error}</Alert>
    </div>
  );
}

export function LessonList({ lessons, mode, onChange, empty = 'Nenhuma aula.' }) {
  if (!lessons?.length) return <p className="muted">{empty}</p>;
  return lessons.map((l) => <LessonCard key={l.id} l={l} mode={mode} onChange={onChange} />);
}

export function BookingForm({ students, teachers, admin = false, today, onDone }) {
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [teacher, setTeacher] = useState(teachers[0]?.id || '');
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [source, setSource] = useState('whatsapp');
  const [slot, setSlot] = useState('');
  const slots = useData(async () => { setSlot(''); return teacher && date ? getSlots(teacher, date) : []; }, [teacher, date]);
  const { error, busy, run } = useAction();

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await rpc('book_lesson', { p_student: Number(studentId), p_teacher: teacher, p_starts: slot, p_duration: 60, p_topic: topic || null, p_source: admin ? source : 'site' });
      onDone?.();
    });
  };
  return (
    <form onSubmit={submit} className="stack">
      <div className="row">
        <label>Aluno<select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Professor<select value={teacher} onChange={(e) => setTeacher(e.target.value)} required>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Data<input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required /></label>
      </div>
      <div>
        <div className="muted" style={{ marginBottom: '.4rem' }}>Horários disponíveis</div>
        {!date ? <span className="muted">Escolha uma data.</span> : slots.loading ? <span className="muted">Buscando…</span> : slots.error ? <Alert>{slots.error}</Alert> :
          !slots.data?.length ? <span className="muted">Nenhum horário livre nesse dia. Tente outra data ou outro professor.</span> :
            <div className="slots">{slots.data.map((s) => <button type="button" key={s} className={`slot ${slot === s ? 'sel' : ''}`} onClick={() => setSlot(s)}>{fmtTime(s)}</button>)}</div>}
      </div>
      <label>Assunto / dificuldade (opcional)<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: frações, prova de sexta" /></label>
      {admin && <label>Como foi pedido?<select value={source} onChange={(e) => setSource(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="admin">Presencial / telefone</option></select></label>}
      <Alert>{error}</Alert>
      <button className="btn" disabled={!slot || busy}>{busy ? 'Agendando…' : 'Confirmar agendamento'}</button>
    </form>
  );
}

// ---------- Aluno ----------
// internal=true mostra também notas internas e dados de saúde
export function StudentSheet({ student: st, internal = false, refreshKey }) {
  const state = useData(async () => {
    const [guardians, notes] = await Promise.all([
      q(supabase.from('guardians').select('*').eq('family_id', st.family_id)),
      q(supabase.from('student_notes').select('*, teacher:profiles(name)').eq('student_id', st.id).order('created_at', { ascending: false }).limit(30)),
    ]);
    return { guardians, notes };
  }, [st.id, refreshKey]);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{st.name}</h2>
      <dl>
        <dt>Nascimento</dt><dd>{fmtBirth(st.birth_date)}</dd>
        <dt>Escola</dt><dd>{st.school || '—'}</dd>
        <dt>Série</dt><dd>{st.grade || '—'}</dd>
        <dt>Nível</dt><dd>{st.level || '—'}</dd>
        <dt>Objetivos</dt><dd>{st.goals || '—'}</dd>
        {internal && <><dt>Saúde / atenção</dt><dd>{st.health_notes || '—'}</dd></>}
        <dt>Responsáveis</dt>
        <dd>{state.data?.guardians.length ? state.data.guardians.map((g) => `${g.name}${g.relationship ? ` (${g.relationship})` : ''}${g.phone ? ` · ${g.phone}` : ''}`).join(' | ') : '—'}</dd>
      </dl>
      <h3 style={{ marginTop: '1rem' }}>Observações das aulas</h3>
      <Async state={state}>{({ notes }) => (<>
        {notes.length === 0 && <p className="muted">Nenhuma observação ainda.</p>}
        {notes.map((n) => (
          <div key={n.id} style={{ borderTop: '1px solid var(--line)', padding: '.5rem 0' }}>
            <div className="muted">{fmtDateTime(n.created_at)} · {n.teacher?.name || 'Equipe'}{internal && !n.visible_to_family && ' · interna'}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{n.content}</div>
          </div>
        ))}
      </>)}</Async>
    </div>
  );
}

export function NoteForm({ studentId, onSaved }) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState(true);
  const { error, busy, run } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await q(supabase.from('student_notes').insert({ student_id: studentId, teacher_id: profile.id, content: content.trim(), visible_to_family: visible }));
      setContent(''); onSaved?.();
    });
  };
  return (
    <form onSubmit={submit} className="card stack">
      <h3>Nova observação</h3>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Como foi a aula, dificuldades, tarefa de casa…" required />
      <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 500 }}>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} style={{ width: 'auto' }} /> Visível para os pais
      </label>
      <Alert>{error}</Alert>
      <div><button className="btn" disabled={busy}>Salvar observação</button></div>
    </form>
  );
}

// ---------- Pagamentos ----------
export function BillingBadge({ b }) {
  if (!b) return null;
  if (b.pending > 0) return <span className="badge cancelada">{fmtH(b.pending)} h pendente(s)</span>;
  return <span className="badge realizada">{fmtH(b.balance)} h de crédito</span>;
}

export function BillingSummary({ student, admin = false, refreshKey, onChange }) {
  const state = useData(() => getBilling(student.id), [student.id, refreshKey]);
  const { error, run } = useAction();
  const remove = (id) => run(async () => { await q(supabase.from('payments').delete().eq('id', id)); state.reload(); onChange?.(); });
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{student.name}</h2>
      <Async state={state}>{(b) => (<>
        <div className="grid">
          <div><div className="muted">Créditos (h) disponíveis</div><div className="stat" style={{ color: 'var(--ok)' }}>{fmtH(b.balance)}</div></div>
          <div><div className="muted">Horas pendentes de pagamento</div><div className="stat" style={{ color: b.pending ? 'var(--bad)' : 'var(--muted)' }}>{fmtH(b.pending)}</div></div>
          <div><div className="muted">Horas agendadas</div><div className="stat">{fmtH(b.scheduled)}</div></div>
        </div>
        {b.scheduledUncovered > 0 && <Alert>{fmtH(b.scheduledUncovered)} h das aulas agendadas ainda não têm crédito. Combine o pagamento com a escola.</Alert>}
        {b.pending > 0 && <Alert>Há {fmtH(b.pending)} h de aulas já realizadas sem pagamento registrado.</Alert>}
        <Alert>{error}</Alert>

        <h3 style={{ marginTop: '1rem' }}>Aulas que consumiram horas</h3>
        {b.history.length === 0 ? <p className="muted">Nenhuma aula realizada ainda.</p> : (
          <div className="tablewrap"><table><thead><tr><th>Data</th><th>Professor</th><th>Situação</th><th>Pagamento</th></tr></thead><tbody>
            {b.history.map((l) => (
              <tr key={l.id}><td>{fmtDateTime(l.starts_at)}</td><td>{l.teacher?.name}</td><td>{l.status === 'faltou' ? 'Falta (cobrada)' : 'Realizada'}</td>
                <td>{l.paid ? <span className="badge realizada">Paga</span> : <span className="badge cancelada">Pendente</span>}</td></tr>
            ))}
          </tbody></table></div>
        )}

        <h3 style={{ marginTop: '1rem' }}>Pagamentos registrados</h3>
        {b.payments.length === 0 ? <p className="muted">Nenhum pagamento registrado.</p> : (
          <div className="tablewrap"><table><thead><tr><th>Data</th><th>Horas</th><th>Valor</th><th>Forma</th><th>Obs.</th>{admin && <th></th>}</tr></thead><tbody>
            {b.payments.map((p) => (
              <tr key={p.id}><td>{new Date(p.paid_at + 'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{fmtH(p.credits)}</td><td>{brl(p.amount_cents)}</td><td>{p.method || '—'}</td><td>{p.note || ''}</td>
                {admin && <td><button className="btn small danger" onClick={() => confirm('Remover este pagamento?') && remove(p.id)}>Remover</button></td>}</tr>
            ))}
          </tbody></table></div>
        )}
      </>)}</Async>
    </div>
  );
}

// ---------- Disponibilidade do professor ----------
export function AvailabilityEditor({ teacherId }) {
  const state = useData(() => q(supabase.from('availability').select('*').eq('teacher_id', teacherId).order('weekday').order('start_time')), [teacherId]);
  const [f, setF] = useState({ weekday: 1, start: '14:00', end: '18:00' });
  const { error, run } = useAction();
  const add = (e) => { e.preventDefault(); run(async () => { await q(supabase.from('availability').insert({ teacher_id: teacherId, weekday: Number(f.weekday), start_time: f.start, end_time: f.end })); state.reload(); }); };
  const del = (id) => run(async () => { await q(supabase.from('availability').delete().eq('id', id)); state.reload(); });
  return (
    <div>
      <Async state={state}>{(rows) => (<>
        {rows.length === 0 && <p className="muted">Nenhum horário cadastrado — os pais não conseguem agendar com este professor.</p>}
        {rows.map((a) => (
          <div key={a.id} className="lesson" style={{ padding: '.25rem 0' }}>
            <span>{WEEKDAYS[a.weekday]}: {a.start_time.slice(0, 5)} às {a.end_time.slice(0, 5)}</span>
            <button className="btn small danger" onClick={() => del(a.id)}>Remover</button>
          </div>
        ))}
      </>)}</Async>
      <form onSubmit={add} className="row" style={{ marginTop: '.6rem', alignItems: 'end' }}>
        <label>Dia<select value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })}>{WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></label>
        <label>Início<input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></label>
        <label>Fim<input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} required /></label>
        <div><button className="btn">Adicionar</button></div>
      </form>
      <Alert>{error}</Alert>
    </div>
  );
}

// ---------- Trocar a própria senha ----------
export function SenhaPage() {
  const [pass, setPass] = useState('');
  const [done, setDone] = useState(false);
  const { error, busy, run } = useAction();
  const submit = (e) => {
    e.preventDefault(); setDone(false);
    if (pass.length < 8) return run(async () => { throw new Error('Use pelo menos 8 caracteres.'); });
    run(async () => { const { error } = await supabase.auth.updateUser({ password: pass }); if (error) throw error; setPass(''); setDone(true); });
  };
  return (
    <>
      <h1>Minha senha</h1>
      <form onSubmit={submit} className="card stack" style={{ maxWidth: 420 }}>
        <label>Nova senha (mín. 8 caracteres)<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" required /></label>
        <Alert>{error}</Alert>
        <Alert ok>{done && 'Senha alterada com sucesso.'}</Alert>
        <div><button className="btn" disabled={busy}>Salvar nova senha</button></div>
      </form>
    </>
  );
}
