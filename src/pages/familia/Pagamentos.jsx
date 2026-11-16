import { Navigate } from 'react-router-dom';
import { Async, BillingSummary } from '../../components';
import { useFamilyStudents } from './shared';

export default function Pagamentos() {
  const st = useFamilyStudents();
  if (!st.loading && !st.isGuardian) return <Navigate to="/familia" replace />;
  return (
    <>
      <h1>Pagamentos e créditos</h1>
      <p className="muted">Cada aula realizada (ou falta sem aviso) usa as horas da aula. Créditos são as horas que já foram pagas.</p>
      <Async state={st}>{(students) => students.map((s) => <BillingSummary key={s.id} student={s} />)}</Async>
    </>
  );
}
