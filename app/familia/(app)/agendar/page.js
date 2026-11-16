import { redirect } from 'next/navigation';
import { familyContext } from '@/lib/family';
import { query } from '@/lib/db';
import { bookLesson } from '@/app/actions';
import { todayYmd } from '@/lib/dates';
import BookingForm from '@/components/BookingForm';

export const dynamic = 'force-dynamic';

export default async function Agendar({ searchParams }) {
  const { isGuardian, students } = await familyContext();
  if (!isGuardian) redirect('/familia');
  const teachers = await query(`SELECT id, name FROM users WHERE role='teacher' AND active AND EXISTS (SELECT 1 FROM availability a WHERE a.teacher_id=users.id) ORDER BY name`);
  const sp = await searchParams;
  return (
    <>
      <h1>Agendar aula</h1>
      <p className="muted">Escolha o aluno, o professor e um horário livre. Se preferir, também pode pedir pelo WhatsApp.</p>
      {sp.erro && <div className="alert">{sp.erro}</div>}
      <div className="card">
        {students.length === 0 || teachers.length === 0
          ? <p>Ainda não há alunos ou professores com horários cadastrados. Fale com a escola.</p>
          : <BookingForm action={bookLesson} students={students.map(s => ({ id: s.id, name: s.name }))} teachers={teachers} today={todayYmd()} />}
      </div>
    </>
  );
}
