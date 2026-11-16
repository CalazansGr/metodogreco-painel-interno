import { query } from '@/lib/db';
import { WEEKDAYS } from '@/lib/dates';
import { addAvailability, removeAvailability } from '@/app/actions';

export default async function AvailabilityEditor({ teacherId }) {
  const rows = await query('SELECT * FROM availability WHERE teacher_id=$1 ORDER BY weekday, start_time', [teacherId]);
  return (
    <div>
      {rows.length === 0 && <p className="muted">Nenhum horário cadastrado — os pais não conseguem agendar com este professor.</p>}
      {rows.map(a => (
        <div key={a.id} className="lesson" style={{ padding: '.25rem 0' }}>
          <span>{WEEKDAYS[a.weekday]}: {a.start_time.slice(0, 5)} às {a.end_time.slice(0, 5)}</span>
          <form action={removeAvailability}><input type="hidden" name="id" value={a.id} /><button className="btn small danger">Remover</button></form>
        </div>
      ))}
      <form action={addAvailability} className="row" style={{ marginTop: '.6rem', alignItems: 'end' }}>
        <input type="hidden" name="teacherId" value={teacherId} />
        <label>Dia<select name="weekday">{WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></label>
        <label>Início<input type="time" name="start" defaultValue="14:00" required /></label>
        <label>Fim<input type="time" name="end" defaultValue="18:00" required /></label>
        <div><button className="btn">Adicionar</button></div>
      </form>
    </div>
  );
}
