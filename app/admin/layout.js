import Shell from '@/components/Shell';
import { requireRole } from '@/lib/auth';

const links = [
  { href: '/admin', label: 'Painel' }, { href: '/admin/aulas', label: 'Aulas' }, { href: '/admin/alunos', label: 'Alunos' },
  { href: '/admin/familias', label: 'Famílias' }, { href: '/admin/professores', label: 'Professores' }, { href: '/admin/pagamentos', label: 'Pagamentos' },
];

export default async function AdminLayout({ children }) {
  const sess = await requireRole('admin');
  return <Shell links={links} who={`Admin · ${sess.name}`}>{children}</Shell>;
}
