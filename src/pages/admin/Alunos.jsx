import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, getBillingMap } from '../../lib';
import { Async, BillingBadge } from '../../components';

export default function Alunos() {
  const state = useData(async () => {
    const [students, fams, bm] = await Promise.all([
      q(supabase.from('students').select('*').eq('active', true).order('name')),
      q(supabase.from('profiles').select('id,name').eq('role', 'family')),
      getBillingMap(),
    ]);
    const fn = Object.fromEntries(fams.map((f) => [f.id, f.name]));
    return students.map((s) => ({ ...s, family_name: fn[s.family_id], b: bm[s.id] }));
  }, []);
  return (
    <>
      <h1>Alunos</h1>
      <p><Link className="btn" to="/admin/familias/nova">+ Nova família / aluno</Link></p>
      <Async state={state}>{(rows) => (
        <div className="tablewrap"><table><thead><tr><th>Aluno</th><th>Série</th><th>Nível</th><th>Família</th><th>Créditos</th></tr></thead><tbody>
          {rows.map((s) => <tr key={s.id}><td><Link to={`/admin/alunos/${s.id}`}>{s.name}</Link></td><td>{s.grade || '—'}</td><td>{s.level || '—'}</td><td>{s.family_name}</td><td><BillingBadge b={s.b} /></td></tr>)}
        </tbody></table></div>
      )}</Async>
    </>
  );
}
