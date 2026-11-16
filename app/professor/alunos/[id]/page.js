import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { one } from '@/lib/db';
import { updateStudent } from '@/app/actions';
import StudentSheet from '@/components/StudentSheet';
import NoteForm from '@/components/NoteForm';

export const dynamic = 'force-dynamic';

export default async function AlunoProf({ params }) {
  const sess = await requireRole('teacher');
  const { id } = await params;
  // Professor só acessa alunos com quem tem (ou teve) aula
  const st = await one('SELECT s.* FROM students s WHERE s.id=$1 AND EXISTS (SELECT 1 FROM lessons l WHERE l.student_id=s.id AND l.teacher_id=$2)', [Number(id), sess.uid]);
  if (!st) notFound();
  const birth = st.birth_date ? new Date(st.birth_date).toISOString().slice(0, 10) : '';
  return (
    <>
      <h1>{st.name}</h1>
      <StudentSheet student={st} internal />
      <NoteForm studentId={st.id} />
      <h2>Atualizar nível e objetivos</h2>
      <form action={updateStudent} className="card stack">
        <input type="hidden" name="id" value={st.id} />
        <input type="hidden" name="name" value={st.name} /><input type="hidden" name="birth" value={birth} />
        <input type="hidden" name="school" value={st.school || ''} /><input type="hidden" name="grade" value={st.grade || ''} />
        <input type="hidden" name="health" value={st.health_notes || ''} />
        <label>Nível<input name="level" defaultValue={st.level || ''} /></label>
        <label>Objetivos<textarea name="goals" defaultValue={st.goals || ''} /></label>
        <div><button className="btn">Salvar</button></div>
      </form>
    </>
  );
}
