import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import { q, useData } from '../lib';
import { Async } from '../components';

export default function Perfil() {
  const { profile, loading, setMode, signOut } = useAuth();
  const nav = useNavigate();
  const [remember, setRemember] = useState(false);
  const state = useData(() => q(supabase.from('students').select('id,name').eq('active', true).order('name')), [profile?.id]);
  if (loading) return <div className="center"><p className="muted">Carregando…</p></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'family') return <Navigate to="/" replace />;

  const pick = (m) => { setMode({ ...m, uid: profile.id }, remember); nav('/familia'); };
  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ textAlign: 'center' }}>Quem está usando?</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Responsáveis agendam aulas e veem pagamentos. Alunos veem só as próprias aulas e a ficha.</p>
        <Async state={state}>{(students) => (
          <div className="profiles">
            <button onClick={() => pick({ type: 'guardian' })}><span className="emoji">👨‍👩‍👧</span>Responsável</button>
            {students.map((s) => <button key={s.id} onClick={() => pick({ type: 'student', studentId: s.id, studentName: s.name })}><span className="emoji">🎒</span>{s.name}</button>)}
          </div>
        )}</Async>
        <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', justifyContent: 'center', fontWeight: 500, marginTop: '1rem' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} /> Lembrar neste aparelho (abrir direto neste perfil)
        </label>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}><button className="btn ghost small" onClick={signOut}>Sair</button></div>
      </div>
    </div>
  );
}
