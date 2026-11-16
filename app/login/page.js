'use client';
import { useActionState } from 'react';
import { login } from '@/app/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="center">
      <div className="card login">
        <h1>Método <span style={{ color: 'var(--accent)' }}>Greco</span></h1>
        <p className="muted">Entre com seu e-mail e senha. Pais e alunos usam o mesmo acesso.</p>
        <form action={action} className="stack">
          <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          {state?.error && <div className="alert">{state.error}</div>}
          <button className="btn" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}
