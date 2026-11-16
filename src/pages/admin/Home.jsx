import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { fetchLessons, dayRange, today, useData, q } from '../../lib';
import { addDays } from '../../dates';
import { Async, LessonList } from '../../components';

export default function AdminHome() {
  const state = useData(async () => {
    const t = dayRange(today(), 1);
    const week = dayRange(today(), 8);
    const [hoje, semana, alunos, profs] = await Promise.all([
      fetchLessons({ ...t, status: 'agendada' }),
      fetchLessons({ from: t.to, to: week.to, status: 'agendada' }),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher').eq('active', true),
    ]);
    return { hoje, semana, alunos: alunos.count ?? 0, profs: profs.count ?? 0 };
  }, []);
  return (
    <>
      <h1>Painel</h1>
      <Async state={state}>{({ hoje, semana, alunos, profs }) => (<>
        <div className="grid">
          <div className="card"><div className="muted">Aulas hoje</div><div className="stat">{hoje.length}</div></div>
          <div className="card"><div className="muted">Próximos 7 dias</div><div className="stat">{semana.length}</div></div>
          <div className="card"><div className="muted">Alunos ativos</div><div className="stat">{alunos}</div></div>
          <div className="card"><div className="muted">Professores</div><div className="stat">{profs}</div></div>
        </div>
        <p><Link className="btn" to="/admin/aulas/nova">+ Agendar aula (ex.: pedido do WhatsApp)</Link></p>
        <h2>Hoje</h2>
        <LessonList lessons={hoje} mode="admin" onChange={state.reload} empty="Sem aulas hoje." />
        <h2>Próximos dias</h2>
        <LessonList lessons={semana} mode="admin" onChange={state.reload} empty="Nada agendado." />
      </>)}</Async>
    </>
  );
}
