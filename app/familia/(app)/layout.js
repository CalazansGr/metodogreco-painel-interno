import Shell from '@/components/Shell';
import { familyContext } from '@/lib/family';

export default async function FamiliaLayout({ children }) {
  const { sess, isGuardian } = await familyContext();
  const links = isGuardian
    ? [{ href: '/familia', label: 'Início' }, { href: '/familia/agendar', label: 'Agendar aula' }, { href: '/familia/ficha', label: 'Ficha' }, { href: '/familia/pagamentos', label: 'Pagamentos' }, { href: '/familia/perfil', label: 'Trocar perfil' }]
    : [{ href: '/familia', label: 'Início' }, { href: '/familia/ficha', label: 'Minha ficha' }, { href: '/familia/perfil', label: 'Trocar perfil' }];
  return <Shell links={links} who={isGuardian ? sess.name : `Aluno: ${sess.profile.studentName}`}>{children}</Shell>;
}
