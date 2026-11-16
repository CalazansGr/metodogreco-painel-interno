import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, getBillingMap, brl } from '../../lib';
import { Async } from '../../components';

export default function PagamentosAdmin() {
  const state = useData(async () => {
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const [students, fams, bm, month] = await Promise.all([
      q(supabase.from('students').select('id,name,family_id').eq('active', true).order('name')),
      q(supabase.from('profiles').select('id,name').eq('role', 'family')),
      getBillingMap(),
      q(supabase.from('payments').select('amount_cents').gte('paid_at', monthStart)),
    ]);
    const fn = Object.fromEntries(fams.map((f) => [f.id, f.name]));
    return { rows: students.map((s) => ({ ...s, family: fn[s.family_id], b: bm[s.id] })), total: month.reduce((a, p) => a + p.amount_cents, 0) };
  }, []);
  return (
    <>
      <h1>Pagamentos</h1>
      <Async state={state}>{({ rows, total }) => {
        const pend = rows.filter((r) => r.b.pending > 0 || r.b.scheduledUncovered > 0).length;
        return (<>
          <div className="grid">
            <div className="card"><div className="muted">Recebido neste mês</div><div className="stat">{brl(total)}</div></div>
            <div className="card"><div className="muted">Alunos com pendência</div><div className="stat" style={{ color: 'var(--bad)' }}>{pend}</div></div>
          </div>
          <h2>Situação por aluno</h2>
          <div className="tablewrap"><table><thead><tr><th>Aluno</th><th>Família</th><th>Créditos</th><th>Pendentes</th><th>Agendadas sem crédito</th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.id}><td><Link to={`/admin/alunos/${r.id}`}>{r.name}</Link></td><td>{r.family}</td><td>{r.b.balance}</td>
                <td style={{ color: r.b.pending ? 'var(--bad)' : undefined, fontWeight: r.b.pending ? 700 : 400 }}>{r.b.pending}</td><td>{r.b.scheduledUncovered}</td></tr>
            ))}
          </tbody></table></div>
        </>);
      }}</Async>
    </>
  );
}
