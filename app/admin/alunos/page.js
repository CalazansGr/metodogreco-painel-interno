import Link from 'next/link';
import { query } from '@/lib/db';
import { getBilling } from '@/lib/billing';
import { BillingBadge } from '@/components/BillingSummary';

export const dynamic = 'force-dynamic';

export default async function Alunos() {
  const students = await query(`SELECT s.*, u.name AS family_name FROM students s JOIN users u ON u.id=s.family_id WHERE s.active ORDER BY s.name`);
  const rows = await Promise.all(students.map(async s => ({ s, b: await getBilling(s.id) })));
  return (
    <>
      <h1>Alunos</h1>
      <p><Link className="btn" href="/admin/familias/nova">+ Nova família / aluno</Link></p>
      <div className="tablewrap"><table><thead><tr><th>Aluno</th><th>Série</th><th>Nível</th><th>Família</th><th>Créditos</th></tr></thead><tbody>
        {rows.map(({ s, b }) => (
          <tr key={s.id}><td><Link href={`/admin/alunos/${s.id}`}>{s.name}</Link></td><td>{s.grade || '—'}</td><td>{s.level || '—'}</td><td>{s.family_name}</td><td><BillingBadge b={b} /></td></tr>
        ))}
      </tbody></table></div>
    </>
  );
}
