import Link from 'next/link';
import { lessonsBetween, dayRange, todayYmd } from '@/lib/lessons';
import { query } from '@/lib/db';
import { addDays } from '@/lib/dates';
import LessonCard from '@/components/LessonCard';

export const dynamic = 'force-dynamic';

export default async function AdminAulas({ searchParams }) {
  const sp = await searchParams;
  const teachers = await query(`SELECT id, name FROM users WHERE role='teacher' ORDER BY name`);
  const teacherId = sp.prof ? Number(sp.prof) : undefined;
  const from = sp.de || addDays(todayYmd(), -7);
  const to = sp.ate || addDays(todayYmd(), 30);
  const lessons = await lessonsBetween({ from: dayRange(from).from, to: dayRange(to).to, teacherId });
  return (
    <>
      <h1>Aulas</h1>
      {sp.ok && <div className="alert ok">Aula agendada.</div>}
      <p><Link className="btn" href="/admin/aulas/nova">+ Agendar aula</Link></p>
      <form className="row card" style={{ alignItems: 'end' }}>
        <label>De<input type="date" name="de" defaultValue={from} /></label>
        <label>Até<input type="date" name="ate" defaultValue={to} /></label>
        <label>Professor<select name="prof" defaultValue={sp.prof || ''}><option value="">Todos</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <div><button className="btn ghost">Filtrar</button></div>
      </form>
      {lessons.length === 0 ? <p className="muted">Nenhuma aula no período.</p> : lessons.map(l => <LessonCard key={l.id} l={l} mode="admin" showStudentLink />)}
    </>
  );
}
