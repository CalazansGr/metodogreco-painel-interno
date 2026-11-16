import { useState } from 'react';
import { supabase, adminSignUp } from '../../supabase';
import { q, useData } from '../../lib';
import { Async, Alert, useAction, AvailabilityEditor } from '../../components';

function NewTeacher({ onSaved }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const { error, busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (f.password.length < 8) throw new Error('A senha inicial precisa ter pelo menos 8 caracteres.');
      const user = await adminSignUp(f.email.trim().toLowerCase(), f.password, f.name.trim());
      await q(supabase.from('profiles').update({ role: 'teacher', name: f.name.trim(), phone: f.phone || null }).eq('id', user.id));
      setF({ name: '', email: '', phone: '', password: '' }); onSaved();
    });
  };
  return (
    <form onSubmit={submit} className="card stack">
      <h3>Novo professor</h3>
      <div className="row">
        <label>Nome<input value={f.name} onChange={set('name')} required /></label>
        <label>E-mail<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label>WhatsApp<input value={f.phone} onChange={set('phone')} /></label>
        <label>Senha inicial (mín. 8)<input value={f.password} onChange={set('password')} required /></label>
      </div>
      <Alert>{error}</Alert>
      <div><button className="btn" disabled={busy}>Cadastrar</button></div>
    </form>
  );
}

export default function Professores() {
  const state = useData(() => q(supabase.from('profiles').select('*').eq('role', 'teacher').order('name')), []);
  const { error, run } = useAction();
  const toggle = (t) => run(async () => { await q(supabase.from('profiles').update({ active: !t.active }).eq('id', t.id)); state.reload(); });
  return (
    <>
      <h1>Professores</h1>
      <NewTeacher onSaved={state.reload} />
      <Alert>{error}</Alert>
      <Async state={state}>{(teachers) => teachers.map((t) => (
        <div key={t.id} className="card">
          <div className="lesson"><h3>{t.name} {!t.active && <span className="badge cancelada">inativo</span>}</h3><span className="muted">{t.email}{t.phone ? ` · ${t.phone}` : ''}</span></div>
          <h3 style={{ margin: '.8rem 0 .3rem' }}>Horários de atendimento</h3>
          <AvailabilityEditor teacherId={t.id} />
          <div className="actions" style={{ marginTop: '.8rem' }}><button className="btn small danger" onClick={() => toggle(t)}>{t.active ? 'Desativar' : 'Reativar'}</button></div>
        </div>
      ))}</Async>
    </>
  );
}
