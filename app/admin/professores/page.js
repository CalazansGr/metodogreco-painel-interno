import { query } from '@/lib/db';
import { createTeacher, resetPassword, toggleActive } from '@/app/actions';
import AvailabilityEditor from '@/components/AvailabilityEditor';

export const dynamic = 'force-dynamic';

export default async function Professores({ searchParams }) {
  const sp = await searchParams;
  const teachers = await query(`SELECT * FROM users WHERE role='teacher' ORDER BY name`);
  return (
    <>
      <h1>Professores</h1>
      {sp.erro && <div className="alert">{sp.erro}</div>}
      <form action={createTeacher} className="card stack">
        <h3>Novo professor</h3>
        <div className="row">
          <label>Nome<input name="name" required /></label>
          <label>E-mail<input type="email" name="email" required /></label>
          <label>WhatsApp<input name="phone" /></label>
          <label>Senha inicial<input name="password" placeholder="greco123" /></label>
        </div>
        <div><button className="btn">Cadastrar</button></div>
      </form>
      {teachers.map(t => (
        <div key={t.id} className="card">
          <div className="lesson"><h3>{t.name} {!t.active && <span className="badge cancelada">inativo</span>}</h3><span className="muted">{t.email}{t.phone ? ` · ${t.phone}` : ''}</span></div>
          <h3 style={{ margin: '.8rem 0 .3rem' }}>Horários de atendimento</h3>
          <AvailabilityEditor teacherId={t.id} />
          <div className="actions" style={{ marginTop: '.8rem' }}>
            <form action={resetPassword} className="actions"><input type="hidden" name="userId" value={t.id} /><input name="password" placeholder="Nova senha (mín. 6)" style={{ width: 190 }} /><button className="btn small ghost">Redefinir senha</button></form>
            <form action={toggleActive}><input type="hidden" name="userId" value={t.id} /><button className="btn small danger">{t.active ? 'Desativar' : 'Reativar'}</button></form>
          </div>
        </div>
      ))}
    </>
  );
}
