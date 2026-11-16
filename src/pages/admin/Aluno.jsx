import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, fetchLessons, today } from '../../lib';
import { Async, Alert, useAction, StudentSheet, BillingSummary, NoteForm, LessonList } from '../../components';
import { useAuth } from '../../auth';

function EditForm({ st, onSaved }) {
  const [f, setF] = useState({ name: st.name, birth: st.birth_date || '', school: st.school || '', grade: st.grade || '', level: st.level || '', goals: st.goals || '', health: st.health_notes || '' });
  const { error, busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await q(supabase.from('students').update({ name: f.name.trim(), birth_date: f.birth || null, school: f.school || null, grade: f.grade || null, level: f.level || null, goals: f.goals || null, health_notes: f.health || null }).eq('id', st.id));
      onSaved();
    });
  };
  return (
    <form onSubmit={submit} className="card stack">
      <div className="row">
        <label>Nome<input value={f.name} onChange={set('name')} required /></label>
        <label>Nascimento<input type="date" value={f.birth} onChange={set('birth')} /></label>
        <label>Escola<input value={f.school} onChange={set('school')} /></label>
        <label>Série<input value={f.grade} onChange={set('grade')} /></label>
        <label>Nível<input value={f.level} onChange={set('level')} placeholder="Coragem / Aprendiz / Aventura" /></label>
      </div>
      <label>Objetivos<textarea value={f.goals} onChange={set('goals')} /></label>
      <label>Saúde / pontos de atenção (interno)<textarea value={f.health} onChange={set('health')} /></label>
      <Alert>{error}</Alert>
      <div><button className="btn" disabled={busy}>Salvar ficha</button></div>
    </form>
  );
}

function PaymentForm({ studentId, onSaved }) {
  const { profile } = useAuth();
  const [f, setF] = useState({ credits: 4, amount: '', method: 'Pix', paidAt: today(), note: '' });
  const { error, busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const amount = Math.round(parseFloat(String(f.amount || '0').replace(',', '.')) * 100);
      if (isNaN(amount) || amount < 0) throw new Error('Valor inválido.');
      await q(supabase.from('payments').insert({ student_id: studentId, credits: Number(f.credits), amount_cents: amount, method: f.method, note: f.note || null, paid_at: f.paidAt, created_by: profile.id }));
      setF({ ...f, amount: '', note: '' }); onSaved();
    });
  };
  return (
    <form onSubmit={submit} className="card stack">
      <h3>Registrar pagamento</h3>
      <div className="row">
        <label>Horas pagas<input type="number" min="0.5" step="0.5" value={f.credits} onChange={set('credits')} required /></label>
        <label>Valor (R$)<input inputMode="decimal" value={f.amount} onChange={set('amount')} placeholder="0,00" /></label>
        <label>Forma<select value={f.method} onChange={set('method')}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option></select></label>
        <label>Data<input type="date" value={f.paidAt} onChange={set('paidAt')} required /></label>
      </div>
      <label>Observação<input value={f.note} onChange={set('note')} placeholder="Ex.: mensalidade de novembro" /></label>
      <Alert>{error}</Alert>
      <div><button className="btn" disabled={busy}>Registrar</button></div>
    </form>
  );
}

export default function AlunoAdmin() {
  const { id } = useParams();
  const [k, setK] = useState(0);
  const bump = () => setK((x) => x + 1);
  const state = useData(async () => {
    const st = await q(supabase.from('students').select('*').eq('id', id).maybeSingle());
    const lessons = st ? (await fetchLessons({ studentIds: [st.id], desc: true })).slice(0, 10) : [];
    return { st, lessons };
  }, [id, k]);
  return (
    <Async state={state}>{({ st, lessons }) => !st ? <Alert>Aluno não encontrado.</Alert> : (<>
      <h1>{st.name}</h1>
      <StudentSheet student={st} internal refreshKey={k} />
      <NoteForm studentId={st.id} onSaved={bump} />
      <h2>Editar ficha</h2>
      <EditForm key={k} st={st} onSaved={bump} />
      <h2>Pagamentos</h2>
      <BillingSummary student={st} admin refreshKey={k} onChange={bump} />
      <PaymentForm studentId={st.id} onSaved={bump} />
      <h2>Últimas aulas</h2>
      <LessonList lessons={lessons} mode="admin" onChange={bump} />
    </>)}</Async>
  );
}
