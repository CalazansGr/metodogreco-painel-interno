import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { chooseProfile, logout } from '@/app/actions';

export default async function PerfilPage() {
  const sess = await requireRole('family');
  const students = await query('SELECT id, name FROM students WHERE family_id=$1 AND active ORDER BY name', [sess.uid]);
  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ textAlign: 'center' }}>Quem está usando?</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Responsáveis agendam aulas e veem pagamentos. Alunos veem só as próprias aulas e a ficha.</p>
        <div className="profiles">
          <form action={chooseProfile}><input type="hidden" name="type" value="guardian" />
            <button><span className="emoji">👨‍👩‍👧</span>Responsável</button></form>
          {students.map(s => (
            <form key={s.id} action={chooseProfile}><input type="hidden" name="type" value="student" /><input type="hidden" name="studentId" value={s.id} />
              <button><span className="emoji">🎒</span>{s.name}</button></form>
          ))}
        </div>
        <form action={logout} style={{ textAlign: 'center', marginTop: '1.5rem' }}><button className="btn ghost small">Sair</button></form>
      </div>
    </div>
  );
}
