import { requireRole } from '@/lib/auth';
import AvailabilityEditor from '@/components/AvailabilityEditor';

export const dynamic = 'force-dynamic';

export default async function Disponibilidade() {
  const sess = await requireRole('teacher');
  return (
    <>
      <h1>Meus horários</h1>
      <p className="muted">Os pais só conseguem agendar dentro destes horários.</p>
      <div className="card"><AvailabilityEditor teacherId={sess.uid} /></div>
    </>
  );
}
