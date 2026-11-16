import Link from 'next/link';
import { lessonsBetween, dayRange, todayYmd } from '@/lib/lessons';
import { query } from '@/lib/db';
import LessonCard from '@/components/LessonCard';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const today = dayRange(todayYmd(), 1);
  const week = dayRange(todayYmd(), 7);
  const [hoje, semana] = await Promise.all([lessonsBetween({ ...today, status: 'agendada' }), lessonsBetween({ from: today.to, to: week.to, status: 'agendada' })]);
  const [c] = await query(`SELECT (SELECT count(*) FROM students WHERE active)::int AS alunos, (SELECT count(*) FROM users WHERE role='teacher' AND active)::int AS profs`);
  return (
    <>
      <h1>Painel</h1>
      <div className="grid">
        <div className="card"><div className="muted">Aulas hoje</div><div className="stat">{hoje.length}</div></div>
        <div className="card"><div className="muted">Próximos 7 dias</div><div className="stat">{semana.length}</div></div>
        <div className="card"><div className="muted">Alunos ativos</div><div className="stat">{c.alunos}</div></div>
        <div className="card"><div className="muted">Professores</div><div className="stat">{c.profs}</div></div>
      </div>
      <p><Link className="btn" href="/admin/aulas/nova">+ Agendar aula (ex.: pedido do WhatsApp)</Link></p>
      <h2>Hoje</h2>
      {hoje.length === 0 ? <p className="muted">Sem aulas hoje.</p> : hoje.map(l => <LessonCard key={l.id} l={l} mode="admin" showStudentLink />)}
      <h2>Próximos dias</h2>
      {semana.length === 0 ? <p className="muted">Nada agendado.</p> : semana.map(l => <LessonCard key={l.id} l={l} mode="admin" showStudentLink />)}
    </>
  );
}
