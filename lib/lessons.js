import { query, one } from '@/lib/db';
import { toInstant, weekdayOf, ymd, todayYmd } from '@/lib/dates';

// Horários livres de um professor em uma data (blocos de `duration` minutos).
export async function getSlots(teacherId, dateStr, duration = 60) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  const av = await query('SELECT start_time, end_time FROM availability WHERE teacher_id=$1 AND weekday=$2 ORDER BY start_time', [teacherId, weekdayOf(dateStr)]);
  const dayStart = toInstant(dateStr, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const busy = await query(
    `SELECT starts_at, duration_min FROM lessons WHERE teacher_id=$1 AND status IN ('agendada','realizada') AND starts_at >= $2 AND starts_at < $3`,
    [teacherId, dayStart.toISOString(), dayEnd.toISOString()]
  );
  const busyRanges = busy.map(b => [new Date(b.starts_at).getTime(), new Date(b.starts_at).getTime() + b.duration_min * 60000]);
  const now = Date.now();
  const out = [];
  for (const a of av) {
    let t = toInstant(dateStr, a.start_time).getTime();
    const end = toInstant(dateStr, a.end_time).getTime();
    while (t + duration * 60000 <= end) {
      const s = t, e = t + duration * 60000;
      const clash = busyRanges.some(([bs, be]) => s < be && e > bs);
      if (!clash && s > now) out.push(new Date(s).toISOString());
      t += duration * 60000;
    }
  }
  return out;
}

// Cria aula verificando conflitos (professor e aluno). Retorna { ok, error }.
export async function createLesson({ studentId, teacherId, startsAt, duration = 60, source, topic, createdBy }) {
  const start = new Date(startsAt);
  if (isNaN(start)) return { ok: false, error: 'Data/horário inválido.' };
  if (start.getTime() < Date.now() - 60000) return { ok: false, error: 'Esse horário já passou.' };
  const end = new Date(start.getTime() + duration * 60000);
  const clash = await one(
    `SELECT 1 AS x FROM lessons WHERE status IN ('agendada','realizada') AND (teacher_id=$1 OR student_id=$2)
     AND starts_at < $4 AND starts_at + (duration_min || ' minutes')::interval > $3`,
    [teacherId, studentId, start.toISOString(), end.toISOString()]
  );
  if (clash) return { ok: false, error: 'Horário indisponível: já existe uma aula nesse período para o professor ou para o aluno.' };
  await query(
    'INSERT INTO lessons(student_id,teacher_id,starts_at,duration_min,source,topic,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [studentId, teacherId, start.toISOString(), duration, source, topic || null, createdBy]
  );
  return { ok: true };
}

const LESSON_SELECT = `
  SELECT l.*, s.name AS student_name, s.family_id, t.name AS teacher_name, t.phone AS teacher_phone
  FROM lessons l JOIN students s ON s.id=l.student_id JOIN users t ON t.id=l.teacher_id`;

export async function lessonsBetween({ from, to, teacherId, studentIds, status } = {}) {
  const where = [], p = [];
  if (from) { p.push(from); where.push(`l.starts_at >= $${p.length}`); }
  if (to) { p.push(to); where.push(`l.starts_at < $${p.length}`); }
  if (teacherId) { p.push(teacherId); where.push(`l.teacher_id = $${p.length}`); }
  if (studentIds) { p.push(studentIds); where.push(`l.student_id = ANY($${p.length}::int[])`); }
  if (status) { p.push(status); where.push(`l.status = $${p.length}`); }
  return query(`${LESSON_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY l.starts_at`, p);
}

export function dayRange(dateStr, days = 1) {
  const a = toInstant(dateStr, '00:00');
  return { from: a.toISOString(), to: new Date(a.getTime() + days * 86400000).toISOString() };
}
export { todayYmd, ymd };
