import { useAuth } from '../../auth';
import { fetchLessons, dayRange, today, useData } from '../../lib';
import { addDays } from '../../dates';
import { Async, LessonList } from '../../components';

export default function ProfHome() {
  const { profile } = useAuth();
  const state = useData(async () => {
    const t = dayRange(today(), 1);
    const rest = dayRange(addDays(today(), 1), 14);
    const base = { teacherId: profile.id, status: 'agendada' };
    const [hoje, prox, pass] = await Promise.all([
      fetchLessons({ ...t, ...base }),
      fetchLessons({ ...rest, ...base }),
      fetchLessons({ from: dayRange(addDays(today(), -14)).from, to: t.from, ...base }),
    ]);
    return { hoje, prox, pass };
  }, [profile.id]);
  return (
    <>
      <h1>Minha agenda</h1>
      <Async state={state}>{({ hoje, prox, pass }) => (<>
        <h2>Hoje ({hoje.length})</h2>
        <LessonList lessons={hoje} mode="teacher" onChange={state.reload} empty="Sem aulas hoje." />
        <h2>Próximos 14 dias ({prox.length})</h2>
        <LessonList lessons={prox} mode="teacher" onChange={state.reload} empty="Nada agendado." />
        {pass.length > 0 && (<>
          <h2>Aulas passadas sem registro</h2>
          <p className="muted">Marque como realizada ou faltou para o controle de créditos ficar correto.</p>
          <LessonList lessons={pass} mode="teacher" onChange={state.reload} />
        </>)}
      </>)}</Async>
    </>
  );
}
