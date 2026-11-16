import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData } from '../../lib';
import { Async, Alert, useAction } from '../../components';

function Manage({ f, onSaved }) {
  const [stu, setStu] = useState({ name: '', grade: '', level: '' });
  const [g, setG] = useState({ name: '', relationship: '', phone: '' });
  const { error, run } = useAction();
  const addStudent = (e) => { e.preventDefault(); run(async () => { await q(supabase.from('students').insert({ family_id: f.id, name: stu.name.trim(), grade: stu.grade || null, level: stu.level || null })); setStu({ name: '', grade: '', level: '' }); onSaved(); }); };
  const addGuardian = (e) => { e.preventDefault(); run(async () => { await q(supabase.from('guardians').insert({ family_id: f.id, name: g.name.trim(), relationship: g.relationship || null, phone: g.phone || null })); setG({ name: '', relationship: '', phone: '' }); onSaved(); }); };
  const toggle = () => run(async () => { await q(supabase.from('profiles').update({ active: !f.active }).eq('id', f.id)); onSaved(); });
  return (
    <details><summary>Gerenciar</summary>
      <form onSubmit={addStudent} className="row" style={{ margin: '.6rem 0', alignItems: 'end' }}>
        <label>Novo aluno<input value={stu.name} onChange={(e) => setStu({ ...stu, name: e.target.value })} required /></label>
        <label>Série<input value={stu.grade} onChange={(e) => setStu({ ...stu, grade: e.target.value })} /></label>
        <label>Nível<input value={stu.level} onChange={(e) => setStu({ ...stu, level: e.target.value })} /></label>
        <div><button className="btn small">Adicionar aluno</button></div>
      </form>
      <form onSubmit={addGuardian} className="row" style={{ margin: '.6rem 0', alignItems: 'end' }}>
        <label>Novo responsável<input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} required /></label>
        <label>Parentesco<input value={g.relationship} onChange={(e) => setG({ ...g, relationship: e.target.value })} /></label>
        <label>Telefone<input value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></label>
        <div><button className="btn small">Adicionar responsável</button></div>
      </form>
      <Alert>{error}</Alert>
      <button className="btn small danger" onClick={toggle}>{f.active ? 'Desativar família' : 'Reativar família'}</button>
      <p className="muted">Para redefinir a senha: Supabase &gt; Authentication &gt; Users &gt; (usuário) &gt; Send password recovery / Update user.</p>
    </details>
  );
}

export default function Familias() {
  const state = useData(async () => {
    const [fams, students, guardians] = await Promise.all([
      q(supabase.from('profiles').select('*').eq('role', 'family').order('name')),
      q(supabase.from('students').select('id,family_id,name').eq('active', true).order('name')),
      q(supabase.from('guardians').select('*').order('id')),
    ]);
    return { fams, students, guardians };
  }, []);
  return (
    <>
      <h1>Famílias</h1>
      <p className="muted">Cada família tem um único login, usado por pais e alunos.</p>
      <p><Link className="btn" to="/admin/familias/nova">+ Nova família</Link></p>
      <Async state={state}>{({ fams, students, guardians }) => fams.map((f) => (
        <div key={f.id} className="card">
          <div className="lesson"><h3>{f.name} {!f.active && <span className="badge cancelada">inativa</span>}</h3><span className="muted">{f.email}</span></div>
          <p className="muted" style={{ margin: '.4rem 0' }}>Responsáveis: {guardians.filter((g) => g.family_id === f.id).map((g) => `${g.name}${g.relationship ? ` (${g.relationship})` : ''}`).join(', ') || '—'}</p>
          <p style={{ margin: '.4rem 0' }}>Alunos: {students.filter((s) => s.family_id === f.id).map((s) => <Link key={s.id} to={`/admin/alunos/${s.id}`} style={{ marginRight: '.6rem' }}>{s.name}</Link>)}</p>
          <Manage f={f} onSaved={state.reload} />
        </div>
      ))}</Async>
    </>
  );
}
