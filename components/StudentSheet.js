import { query } from '@/lib/db';
import { fmtDateTime } from '@/lib/dates';

const fmtBirth = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

// Ficha do aluno (somente leitura). internal=true mostra também notas internas e dados de saúde.
export default async function StudentSheet({ student: st, internal = false }) {
  const guardians = await query('SELECT * FROM guardians WHERE family_id=$1', [st.family_id]);
  const notes = await query(
    `SELECT n.*, u.name AS teacher_name FROM student_notes n LEFT JOIN users u ON u.id=n.teacher_id
     WHERE n.student_id=$1 ${internal ? '' : 'AND n.visible_to_family'} ORDER BY n.created_at DESC LIMIT 30`, [st.id]);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{st.name}</h2>
      <dl>
        <dt>Nascimento</dt><dd>{fmtBirth(st.birth_date)}</dd>
        <dt>Escola</dt><dd>{st.school || '—'}</dd>
        <dt>Série</dt><dd>{st.grade || '—'}</dd>
        <dt>Nível</dt><dd>{st.level || '—'}</dd>
        <dt>Objetivos</dt><dd>{st.goals || '—'}</dd>
        {internal && <><dt>Saúde / atenção</dt><dd>{st.health_notes || '—'}</dd></>}
        <dt>Responsáveis</dt>
        <dd>{guardians.length ? guardians.map(g => `${g.name}${g.relationship ? ` (${g.relationship})` : ''}${g.phone ? ` · ${g.phone}` : ''}`).join(' | ') : '—'}</dd>
      </dl>
      <h3 style={{ marginTop: '1rem' }}>Observações das aulas</h3>
      {notes.length === 0 && <p className="muted">Nenhuma observação ainda.</p>}
      {notes.map(n => (
        <div key={n.id} style={{ borderTop: '1px solid var(--line)', padding: '.5rem 0' }}>
          <div className="muted">{fmtDateTime(n.created_at)} · {n.teacher_name || 'Equipe'}{internal && !n.visible_to_family && ' · interna'}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{n.content}</div>
        </div>
      ))}
    </div>
  );
}
