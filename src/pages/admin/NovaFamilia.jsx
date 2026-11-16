import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, adminSignUp } from '../../supabase';
import { q } from '../../lib';
import { Alert, useAction } from '../../components';

export default function NovaFamilia() {
  const nav = useNavigate();
  const [f, setF] = useState({ familyName: '', email: '', password: '', guardianName: '', relationship: '', phone: '', studentName: '', birth: '', school: '', grade: '', level: '' });
  const { error, busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (f.password.length < 8) throw new Error('A senha inicial precisa ter pelo menos 8 caracteres.');
      const user = await adminSignUp(f.email.trim().toLowerCase(), f.password, f.familyName.trim());
      await q(supabase.from('profiles').update({ role: 'family', name: f.familyName.trim(), phone: f.phone || null }).eq('id', user.id));
      if (f.guardianName) await q(supabase.from('guardians').insert({ family_id: user.id, name: f.guardianName.trim(), relationship: f.relationship || null, phone: f.phone || null }));
      if (f.studentName) await q(supabase.from('students').insert({ family_id: user.id, name: f.studentName.trim(), birth_date: f.birth || null, school: f.school || null, grade: f.grade || null, level: f.level || null }));
      nav('/admin/familias');
    });
  };
  return (
    <>
      <h1>Nova família</h1>
      <form onSubmit={submit} className="card stack">
        <h3>Login da família</h3>
        <div className="row">
          <label>Nome da família<input value={f.familyName} onChange={set('familyName')} placeholder="Família Souza" required /></label>
          <label>E-mail de acesso<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>Senha inicial (mín. 8)<input value={f.password} onChange={set('password')} required /></label>
        </div>
        <h3>Responsável</h3>
        <div className="row">
          <label>Nome<input value={f.guardianName} onChange={set('guardianName')} /></label>
          <label>Parentesco<input value={f.relationship} onChange={set('relationship')} placeholder="Mãe, Pai…" /></label>
          <label>WhatsApp<input value={f.phone} onChange={set('phone')} /></label>
        </div>
        <h3>Primeiro aluno</h3>
        <div className="row">
          <label>Nome<input value={f.studentName} onChange={set('studentName')} /></label>
          <label>Nascimento<input type="date" value={f.birth} onChange={set('birth')} /></label>
          <label>Escola<input value={f.school} onChange={set('school')} /></label>
          <label>Série<input value={f.grade} onChange={set('grade')} /></label>
          <label>Nível<input value={f.level} onChange={set('level')} placeholder="Coragem / Aprendiz / Aventura" /></label>
        </div>
        <Alert>{error}</Alert>
        <div><button className="btn" disabled={busy}>{busy ? 'Criando…' : 'Criar família'}</button></div>
      </form>
    </>
  );
}
