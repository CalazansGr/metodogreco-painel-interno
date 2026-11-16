import Link from 'next/link';
import { query } from '@/lib/db';
import { getBilling, brl } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export default async function PagamentosAdmin() {
  const students = await query(`SELECT s.id, s.name, u.name AS family_name FROM students s JOIN users u ON u.id=s.family_id WHERE s.active ORDER BY s.name`);
  const rows = await Promise.all(students.map(async s => ({ s, b: await getBilling(s.id) })));
  const pendentes = rows.filter(r => r.b.pending > 0 || r.b.scheduledUncovered > 0);
  const [tot] = await query(`SELECT COALESCE(sum(amount_cents),0)::int AS total FROM payments WHERE paid_at >= date_trunc('month', CURRENT_DATE)`);
  return (
    <>
      <h1>Pagamentos</h1>
      <div className="grid">
        <div className="card"><div className="muted">Recebido neste mês</div><div className="stat">{brl(tot.total)}</div></div>
        <div className="card"><div className="muted">Alunos com pendência</div><div className="stat" style={{ color: 'var(--bad)' }}>{pendentes.length}</div></div>
      </div>
      <h2>Situação por aluno</h2>
      <div className="tablewrap"><table><thead><tr><th>Aluno</th><th>Família</th><th>Créditos</th><th>Pendentes</th><th>Agendadas sem crédito</th></tr></thead><tbody>
        {rows.map(({ s, b }) => (
          <tr key={s.id}><td><Link href={`/admin/alunos/${s.id}`}>{s.name}</Link></td><td>{s.family_name}</td><td>{b.balance}</td>
            <td style={{ color: b.pending ? 'var(--bad)' : undefined, fontWeight: b.pending ? 700 : 400 }}>{b.pending}</td><td>{b.scheduledUncovered}</td></tr>
        ))}
      </tbody></table></div>
    </>
  );
}
