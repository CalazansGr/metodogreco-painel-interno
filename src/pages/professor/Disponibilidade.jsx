import { useAuth } from '../../auth';
import { AvailabilityEditor } from '../../components';

export default function Disponibilidade() {
  const { profile } = useAuth();
  return (
    <>
      <h1>Meus horários</h1>
      <p className="muted">Os pais só conseguem agendar dentro destes horários.</p>
      <div className="card"><AvailabilityEditor teacherId={profile.id} /></div>
    </>
  );
}
