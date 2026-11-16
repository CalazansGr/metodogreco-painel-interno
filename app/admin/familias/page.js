import Link from 'next/link';
import { query } from '@/lib/db';
import { addStudent, addGuardian, resetPassword, toggleActive } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Familias() {
  const fams = await query(`SELECT * FROM users WHERE role='family' ORDER BY name`);
  const students = await query('SELECT id, family_id, name FROM students WHERE active ORDER BY name');
  const guardians = await query('SELECT * FROM guardians ORDER BY id');
  return (
    <>
      <h1>Famílias</h1>
      <p className="muted">Cada família tem um único login, usado por pais e alunos.</p>
      <p><Link className="btn" href="/admin/familias/nova">+ Nova família</Link></p>
      {fams.map(f => (
        <div key={f.id} className="card">
          <div className="lesson"><h3>{f.name} {!f.active && <span className="badge cancelada">inativa</span>}</h3><span className="muted">{f.email}</span></div>
          <p className="muted" style={{ margin: '.4rem 0' }}>
            Responsáveis: {guardians.filter(g => g.family_id === f.id).map(g => `${g.name}${g.relationship ? ` (${g.relationship})` : ''}`).join(', ') || '—'}
          </p>
          <p style={{ margin: '.4rem 0' }}>Alunos: {students.filter(s => s.family_id === f.id).map(s => <Link key={s.id} href={`/admin/alunos/${s.id}`} style={{ marginRight: '.6rem' }}>{s.name}</Link>)}</p>
          <details><summary>Gerenciar</summary>
            <form action={addStudent} className="row" style={{ margin: '.6rem 0', alignItems: 'end' }}>
              <input type="hidden" name="familyId" value={f.id} />
              <label>Novo aluno<input name="studentName" required /></label>
              <label>Série<input name="grade" /></label>
              <label>Nível<input name="level" /></label>
              <div><button className="btn small">Adicionar aluno</button></div>
            </form>
            <form action={addGuardian} className="row" style={{ margin: '.6rem 0', alignItems: 'end' }}>
              <input type="hidden" name="familyId" value={f.id} />
              <label>Novo responsável<input name="name" required /></label>
              <label>Parentesco<input name="relationship" /></label>
              <label>Telefone<input name="phone" /></label>
              <div><button className="btn small">Adicionar responsável</button></div>
            </form>
            <div className="actions">
              <form action={resetPassword} className="actions"><input type="hidden" name="userId" value={f.id} /><input name="password" placeholder="Nova senha (mín. 6)" style={{ width: 190 }} /><button className="btn small ghost">Redefinir senha</button></form>
              <form action={toggleActive}><input type="hidden" name="userId" value={f.id} /><button className="btn small danger">{f.active ? 'Desativar' : 'Reativar'}</button></form>
            </div>
          </details>
        </div>
      ))}
    </>
  );
}
