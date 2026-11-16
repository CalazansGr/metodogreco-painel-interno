import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Alert } from '../components';

export default function Login() {
  const { profile, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && profile && profile.role !== 'none') return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (error) setError('E-mail ou senha incorretos.');
  };

  return (
    <div className="center">
      <div className="card login">
        <h1>Método <span style={{ color: 'var(--accent)' }}>Greco</span></h1>
        {profile?.role === 'none' ? (<>
          <Alert>Sua conta ainda não foi liberada. Fale com a escola para receber o acesso.</Alert>
          <button className="btn ghost" onClick={signOut}>Sair</button>
        </>) : (<>
          <p className="muted">Entre com seu e-mail e senha. Pais e alunos usam o mesmo acesso.</p>
          <form onSubmit={submit} className="stack">
            <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <Alert>{error}</Alert>
            <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
        </>)}
      </div>
    </div>
  );
}
