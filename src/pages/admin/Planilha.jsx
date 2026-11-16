import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, getBillingMap, brl, fmtH } from '../../lib';
import { Async } from '../../components';

// Célula editável: salva ao sair do campo (ou Enter). Verde = salvou, vermelho = erro.
function Cell({ value, onSave, align, type = 'text', placeholder }) {
  const [v, setV] = useState(value ?? '');
  const [st, setSt] = useState('');
  useEffect(() => setV(value ?? ''), [value]);
  const commit = async () => {
    if (String(v) === String(value ?? '')) return;
    setSt('saving');
    try { await onSave(v); setSt('ok'); setTimeout(() => setSt(''), 1200); }
    catch (e) { setSt('err'); alert(e.message || String(e)); setV(value ?? ''); }
  };
  return (
    <input className={`cell ${st}`} style={{ textAlign: align }} type={type} value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  );
}

// "Alex, Patrícia" -> atualiza/insere/remove responsáveis por posição (mantém parentesco)
async function saveGuardians(familyId, existing, field, text) {
  const parts = text.split(',').map((x) => x.trim()).filter(Boolean);
  if (field === 'name' && parts.length < existing.length && !confirm('Isso remove um responsável desta família. Continuar?')) throw new Error('Cancelado.');
  for (let i = 0; i < parts.length; i++) {
    const g = existing[i];
    if (g) await q(supabase.from('guardians').update({ [field]: parts[i] }).eq('id', g.id));
    else await q(supabase.from('guardians').insert({ family_id: familyId, name: field === 'name' ? parts[i] : 'Responsável', phone: field === 'phone' ? parts[i] : null }));
  }
  for (let i = parts.length; i < existing.length; i++) {
    if (field === 'name') await q(supabase.from('guardians').delete().eq('id', existing[i].id));
    else await q(supabase.from('guardians').update({ phone: null }).eq('id', existing[i].id));
  }
}

const saveAdmin = (studentId, patch) => q(supabase.from('student_admin').upsert({ student_id: studentId, ...patch }, { onConflict: 'student_id' }));

export default function Planilha() {
  const [search, setSearch] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(false);
  const state = useData(async () => {
    const [students, guardians, adm, bm] = await Promise.all([
      q(supabase.from('students').select('id,name,family_id').eq('active', true).order('name')),
      q(supabase.from('guardians').select('*').order('id')),
      q(supabase.from('student_admin').select('*')),
      getBillingMap(),
    ]);
    const admBy = Object.fromEntries(adm.map((a) => [a.student_id, a]));
    return students.map((s) => {
      const g = guardians.filter((x) => x.family_id === s.family_id);
      const a = admBy[s.id] || {};
      const b = bm[s.id];
      return { s, g, a, b, total: b.pending * (a.price_cents || 0) };
    });
  }, []);

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (state.data || []).filter((r) => (!onlyDebt || r.b.pending > 0) &&
      (!t || [r.s.name, ...r.g.map((x) => x.name), r.a.obs].join(' ').toLowerCase().includes(t)));
  }, [state.data, search, onlyDebt]);
  const receivable = (state.data || []).reduce((a, r) => a + r.total, 0);

  return (
    <div className="wide">
      <div className="lesson" style={{ marginBottom: '.6rem' }}>
        <div><h1>Planilha</h1><span className="muted">Clique numa célula para editar; salva ao sair do campo. Horas pendentes × preço = valor a receber.</span></div>
        <div className="card" style={{ margin: 0, textAlign: 'center' }}><div className="muted">A receber</div><div className="stat" style={{ color: receivable ? 'var(--bad)' : 'var(--ok)' }}>{brl(receivable)}</div></div>
      </div>
      <div className="actions" style={{ marginBottom: '.6rem', alignItems: 'center' }}>
        <input placeholder="Buscar aluno, responsável ou obs…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center', fontWeight: 500 }}><input type="checkbox" checked={onlyDebt} onChange={(e) => setOnlyDebt(e.target.checked)} style={{ width: 'auto' }} /> Só com débito</label>
        <Link className="btn small" to="/admin/familias/nova">+ Nova linha (família/aluno)</Link>
      </div>
      <Async state={state}>{() => (
        <div className="tablewrap sheet"><table>
          <thead><tr>
            <th>Responsável</th><th>Celular responsável</th><th>Aluno</th><th>Celular aluno</th>
            <th className="calc">Aulas (h) devendo</th><th>Preço (R$/h)</th><th className="calc">Valor total</th><th className="calc">Créditos (h)</th>
            <th>Obs</th><th>WhatsApp</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(({ s, g, a, b, total }) => (
              <tr key={s.id}>
                <td><Cell value={g.map((x) => x.name).join(', ')} onSave={async (v) => { await saveGuardians(s.family_id, g, 'name', v); state.reload(); }} /></td>
                <td><Cell value={g.map((x) => x.phone || '').filter(Boolean).join(', ')} onSave={async (v) => { await saveGuardians(s.family_id, g, 'phone', v); state.reload(); }} /></td>
                <td><Cell value={s.name} onSave={async (v) => { if (!v.trim()) throw new Error('O nome não pode ficar vazio.'); await q(supabase.from('students').update({ name: v.trim() }).eq('id', s.id)); state.reload(); }} /></td>
                <td><Cell value={a.phone} onSave={async (v) => { await saveAdmin(s.id, { phone: v.trim() || null }); state.reload(); }} /></td>
                <td className="calc num" style={{ color: b.pending ? 'var(--bad)' : undefined, fontWeight: b.pending ? 700 : 400 }}>{fmtH(b.pending)}</td>
                <td><Cell align="right" value={a.price_cents ? String(a.price_cents / 100).replace('.', ',') : ''} placeholder="0" onSave={async (v) => {
                  const n = Math.round(parseFloat(String(v || '0').replace(',', '.')) * 100);
                  if (isNaN(n) || n < 0) throw new Error('Preço inválido.');
                  await saveAdmin(s.id, { price_cents: n }); state.reload();
                }} /></td>
                <td className="calc num">{brl(total)}</td>
                <td className="calc num">{fmtH(b.balance)}</td>
                <td><Cell value={a.obs} onSave={async (v) => { await saveAdmin(s.id, { obs: v.trim() || null }); state.reload(); }} /></td>
                <td>
                  <select className="cell" value={a.whatsapp_type || 'normal'} onChange={async (e) => { try { await saveAdmin(s.id, { whatsapp_type: e.target.value }); state.reload(); } catch (err) { alert(err.message); } }}>
                    <option value="normal">Normal</option><option value="business">Business</option>
                  </select>
                </td>
                <td><Link to={`/admin/alunos/${s.id}`} title="Ficha, pagamentos e aulas">Abrir</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="muted">Nenhum aluno encontrado.</td></tr>}
          </tbody>
          <tfoot><tr><td colSpan={4}><b>Total</b></td>
            <td className="calc num"><b>{fmtH(rows.reduce((a, r) => a + r.b.pending, 0))}</b></td><td></td>
            <td className="calc num"><b>{brl(rows.reduce((a, r) => a + r.total, 0))}</b></td>
            <td className="calc num"><b>{fmtH(rows.reduce((a, r) => a + r.b.balance, 0))}</b></td><td colSpan={3}></td></tr></tfoot>
        </table></div>
      )}</Async>
      <p className="muted">Para registrar um pagamento (somar horas pagas), abra o aluno em "Abrir". Aula realizada ou falta desconta as horas; o que passar do crédito fica em "Aulas (h) devendo".</p>
    </div>
  );
}
