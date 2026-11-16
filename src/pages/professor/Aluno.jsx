import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, rpc, useData } from '../../lib';
import { Async, Alert, useAction, StudentSheet, NoteForm } from '../../components';

export default function ProfAluno() {
  const { id } = useParams();
  const [k, setK] = useState(0);
  const bump = () => setK((x) => x + 1);
  const state = useData(() => q(supabase.from('students').select('*').eq('id', id).maybeSingle()), [id, k]);
  return (
    <Async state={state}>{(st) => !st ? <Alert>Aluno não encontrado.</Alert> : (<>
      <h1>{st.name}</h1>
      <StudentSheet student={st} internal refreshKey={k} />
      <NoteForm studentId={st.id} onSaved={bump} />
      <h2>Atualizar nível e objetivos</h2>
      <LevelForm key={k} st={st} onSaved={bump} />
    </>)}</Async>
  );
}

function LevelForm({ st, onSaved }) {
  const [level, setLevel] = useState(st.level || '');
  const [goals, setGoals] = useState(st.goals || '');
  const { error, busy, run } = useAction();
  return (
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await rpc('teacher_update_student', { p_id: st.id, p_level: level, p_goals: goals }); onSaved(); }); }}>
      <label>Nível<input value={level} onChange={(e) => setLevel(e.target.value)} /></label>
      <label>Objetivos<textarea value={goals} onChange={(e) => setGoals(e.target.value)} /></label>
      <Alert>{error}</Alert>
      <div><button className="btn" disabled={busy}>Salvar</button></div>
    </form>
  );
}
