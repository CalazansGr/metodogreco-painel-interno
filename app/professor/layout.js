import Shell from '@/components/Shell';
import { requireRole } from '@/lib/auth';

export default async function ProfLayout({ children }) {
  const sess = await requireRole('teacher');
  return <Shell links={[{ href: '/professor', label: 'Minha agenda' }, { href: '/professor/disponibilidade', label: 'Meus horários' }]} who={sess.name}>{children}</Shell>;
}
