import { redirect } from 'next/navigation';
import { familyContext } from '@/lib/family';
import BillingSummary from '@/components/BillingSummary';

export const dynamic = 'force-dynamic';

export default async function Pagamentos() {
  const { isGuardian, students } = await familyContext();
  if (!isGuardian) redirect('/familia');
  return (
    <>
      <h1>Pagamentos e créditos</h1>
      <p className="muted">Cada aula realizada (ou falta sem aviso) usa 1 crédito. Créditos são as aulas que já foram pagas.</p>
      {students.map(s => <BillingSummary key={s.id} student={s} />)}
    </>
  );
}
