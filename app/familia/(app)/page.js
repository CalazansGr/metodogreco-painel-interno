import Link from 'next/link';
import { familyContext } from '@/lib/family';
import { lessonsBetween } from '@/lib/lessons';
import { getBilling } from '@/lib/billing';
import LessonCard from '@/components/LessonCard';

export const dynamic = 'force-dynamic';

export default async function FamiliaHome({ searchParams }) {
  const { isGuardian, students } = await familyContext();
  const ids = students.map(s => s.id);
  const sp = await searchParams;
  const next = ids.length ? await lessonsBetween({ from: new Date().toISOString(), studentIds: ids, status: 'agendada' }) : [];
  const recent = ids.length ? (await lessonsBetween({ to: new Date().toISOString(), studentIds: ids })).reverse().slice(0, 5) : [];
  const billings = isGuardian ? await Promise.all(students.map(async s => ({ s, b: await getBilling(s.id) }))) : [];

  return (
    <>
      <h1>Próximas aulas</h1>
      {sp.ok && <div className="alert ok">Aula agendada com sucesso! O professor já foi avisado.</div>}
      {isGuardian && billings.map(({ s, b }) => (
        <Link key={s.id} href="/familia/pagamentos" className="card" style={{ display: 'block' }}>
          <b>{s.name}</b>: {b.pending > 0
            ? <span style={{ color: 'var(--bad)' }}>{b.pending} aula(s) pendente(s) de pagamento</span>
            : <span style={{ color: 'var(--ok)' }}>{b.balance} crédito(s) disponível(is)</span>}
        </Link>
      ))}
      {next.length === 0 ? <div className="card muted">Nenhuma aula agendada. {isGuardian && <Link href="/familia/agendar">Agendar agora</Link>}</div>
        : next.map(l => <LessonCard key={l.id} l={l} mode="family" />)}
      {isGuardian && <p><Link className="btn" href="/familia/agendar">+ Agendar nova aula</Link></p>}
      <h2>Aulas recentes</h2>
      {recent.length === 0 ? <p className="muted">Ainda não há aulas anteriores.</p> : recent.map(l => <LessonCard key={l.id} l={l} mode="family" />)}
    </>
  );
}
