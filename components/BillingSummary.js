import { getBilling, brl } from '@/lib/billing';
import { fmtDateTime } from '@/lib/dates';
import { removePayment } from '@/app/actions';

export function BillingBadge({ b }) {
  if (b.pending > 0) return <span className="badge cancelada">{b.pending} aula(s) pendente(s)</span>;
  return <span className="badge realizada">{b.balance} crédito(s)</span>;
}

// admin=true permite remover pagamentos lançados por engano
export default async function BillingSummary({ student, admin = false }) {
  const b = await getBilling(student.id);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{student.name}</h2>
      <div className="grid">
        <div><div className="muted">Créditos disponíveis</div><div className="stat" style={{ color: 'var(--ok)' }}>{b.balance}</div></div>
        <div><div className="muted">Aulas pendentes de pagamento</div><div className="stat" style={{ color: b.pending ? 'var(--bad)' : 'var(--muted)' }}>{b.pending}</div></div>
        <div><div className="muted">Aulas agendadas</div><div className="stat">{b.scheduled}</div></div>
      </div>
      {b.scheduledUncovered > 0 && <div className="alert">{b.scheduledUncovered} das aulas agendadas ainda não têm crédito. Combine o pagamento com a escola.</div>}
      {b.pending > 0 && <div className="alert">Há {b.pending} aula(s) já realizada(s) sem pagamento registrado.</div>}

      <h3 style={{ marginTop: '1rem' }}>Aulas que consumiram crédito</h3>
      {b.history.length === 0 ? <p className="muted">Nenhuma aula realizada ainda.</p> : (
        <div className="tablewrap"><table><thead><tr><th>Data</th><th>Professor</th><th>Situação</th><th>Pagamento</th></tr></thead><tbody>
          {b.history.map(l => (
            <tr key={l.id}><td>{fmtDateTime(l.starts_at)}</td><td>{l.teacher_name}</td>
              <td>{l.status === 'faltou' ? 'Falta (cobrada)' : 'Realizada'}</td>
              <td>{l.paid ? <span className="badge realizada">Paga</span> : <span className="badge cancelada">Pendente</span>}</td></tr>
          ))}
        </tbody></table></div>
      )}

      <h3 style={{ marginTop: '1rem' }}>Pagamentos registrados</h3>
      {b.payments.length === 0 ? <p className="muted">Nenhum pagamento registrado.</p> : (
        <div className="tablewrap"><table><thead><tr><th>Data</th><th>Aulas</th><th>Valor</th><th>Forma</th><th>Obs.</th>{admin && <th></th>}</tr></thead><tbody>
          {b.payments.map(p => (
            <tr key={p.id}><td>{new Date(p.paid_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td>{p.credits}</td><td>{brl(p.amount_cents)}</td><td>{p.method || '—'}</td><td>{p.note || ''}</td>
              {admin && <td><form action={removePayment}><input type="hidden" name="id" value={p.id} /><button className="btn small danger">Remover</button></form></td>}</tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}
