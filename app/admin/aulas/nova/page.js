import { query } from '@/lib/db';
import { bookLesson } from '@/app/actions';
import { todayYmd } from '@/lib/dates';
import BookingForm from '@/components/BookingForm';

export const dynamic = 'force-dynamic';

export default async function NovaAula({ searchParams }) {
  const sp = await searchParams;
  const students = await query('SELECT id, name FROM students WHERE active ORDER BY name');
  const teachers = await query(`SELECT id, name FROM users WHERE role='teacher' AND active ORDER BY name`);
  return (
    <>
      <h1>Agendar aula</h1>
      <p className="muted">Use quando o pai pedir pelo WhatsApp ou telefone: a aula entra na agenda do professor.</p>
      {sp.erro && <div className="alert">{sp.erro}</div>}
      <div className="card">
        {students.length === 0 || teachers.length === 0
          ? <p>Cadastre ao menos um aluno e um professor (com horários) antes.</p>
          : <BookingForm action={bookLesson} students={students} teachers={teachers} admin today={todayYmd()} />}
      </div>
    </>
  );
}
