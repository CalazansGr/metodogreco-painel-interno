import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Retorna sessão da família + alunos visíveis no perfil atual.
export async function familyContext() {
  const sess = await requireRole('family');
  if (!sess.profile) redirect('/familia/perfil');
  const isGuardian = sess.profile.type === 'guardian';
  const students = isGuardian
    ? await query('SELECT * FROM students WHERE family_id=$1 AND active ORDER BY name', [sess.uid])
    : await query('SELECT * FROM students WHERE id=$1 AND family_id=$2', [sess.profile.studentId, sess.uid]);
  return { sess, isGuardian, students };
}
