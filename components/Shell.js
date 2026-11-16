import Link from 'next/link';
import { logout } from '@/app/actions';

export default function Shell({ links, who, children }) {
  return (
    <>
      <header className="topbar">
        <span className="logo">Método <span>Greco</span></span>
        <nav>{links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
        <span className="who">{who}</span>
        <form action={logout}><button>Sair</button></form>
      </header>
      <main>{children}</main>
    </>
  );
}
