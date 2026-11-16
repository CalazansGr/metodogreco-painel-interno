import { requireRole } from '@/lib/auth';
import { lessonsBetween, dayRange, todayYmd } from '@/lib/lessons';
import { addDays } from '@/lib/dates';
import LessonCard from '@/components/LessonCard';

export const dynamic = 'force-dynamic';

export default async function ProfHome() {
  const sess = await requireRole('teacher');
  const today = dayRange(todayYmd(), 1);
  const rest = dayRange(addDays(todayYmd(), 1), 14);
  const [hoje, prox, pass] = await Promise.all([
    lessonsBetween({ ...today, teacherId: sess.uid, status: 'agendada' }),
    lessonsBetween({ ...rest, teacherId: sess.uid, status: 'agendada' }),
    lessonsBetween({ from: dayRange(addDays(todayYmd(), -14)).from, to: today.from, teacherId: sess.uid, status: 'agendada' }),
  ]);
  return (
    <>
      <h1>Minha agenda</h1>
      <h2>Hoje ({hoje.length})</h2>
      {hoje.length === 0 ? <p className="muted">Sem aulas hoje.</p> : hoje.map(l => <LessonCard key={l.id} l={l} mode="teacher" showStudentLink />)}
      <h2>Próximos 14 dias ({prox.length})</h2>
      {prox.length === 0 ? <p className="muted">Nada agendado.</p> : prox.map(l => <LessonCard key={l.id} l={l} mode="teacher" showStudentLink />)}
      {pass.length > 0 && <>
        <h2>Aulas passadas sem registro</h2>
        <p className="muted">Marque como realizada ou faltou para o controle de créditos ficar correto.</p>
        {pass.map(l => <LessonCard key={l.id} l={l} mode="teacher" showStudentLink />)}
      </>}
    </>
  );
}
