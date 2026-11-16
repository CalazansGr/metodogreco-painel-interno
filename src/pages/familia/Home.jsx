import { Link } from 'react-router-dom';
import { fetchLessons, getBilling, useData } from '../../lib';
import { Async, LessonList, Alert } from '../../components';
import { useFamilyStudents } from './shared';

export default function FamiliaHome() {
  const st = useFamilyStudents();
  const state = useData(async () => {
    const students = st.data;
    if (!students?.length) return { next: [], recent: [], billings: [] };
    const ids = students.map((s) => s.id);
    const now = new Date().toISOString();
    const [next, past] = await Promise.all([
      fetchLessons({ from: now, studentIds: ids, status: 'agendada' }),
      fetchLessons({ to: now, studentIds: ids, desc: true }),
    ]);
    const billings = st.isGuardian ? await Promise.all(students.map(async (s) => ({ s, b: await getBilling(s.id) }))) : [];
    return { next, recent: past.slice(0, 5), billings };
  }, [st.data]);

  if (st.loading && !st.data) return <p className="muted">Carregando…</p>;
  return (
    <>
      <h1>Próximas aulas</h1>
      {st.error && <Alert>{st.error}</Alert>}
      <Async state={state}>{({ next, recent, billings }) => (<>
        {billings.map(({ s, b }) => (
          <Link key={s.id} to="/familia/pagamentos" className="card" style={{ display: 'block' }}>
            <b>{s.name}</b>: {b.pending > 0
              ? <span style={{ color: 'var(--bad)' }}>{b.pending} aula(s) pendente(s) de pagamento</span>
              : <span style={{ color: 'var(--ok)' }}>{b.balance} crédito(s) disponível(is)</span>}
          </Link>
        ))}
        {next.length === 0
          ? <div className="card muted">Nenhuma aula agendada. {st.isGuardian && <Link to="/familia/agendar">Agendar agora</Link>}</div>
          : <LessonList lessons={next} mode="family" onChange={state.reload} />}
        {st.isGuardian && <p><Link className="btn" to="/familia/agendar">+ Agendar nova aula</Link></p>}
        <h2>Aulas recentes</h2>
        <LessonList lessons={recent} mode="family" empty="Ainda não há aulas anteriores." />
      </>)}</Async>
    </>
  );
}
