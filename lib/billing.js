import { query } from '@/lib/db';

export const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Regra: cada aula "realizada" ou "faltou" consome 1 crédito.
// Os créditos cobrem as aulas mais antigas primeiro; o que passar disso fica pendente.
export async function getBilling(studentId) {
  const payments = await query('SELECT * FROM payments WHERE student_id=$1 ORDER BY paid_at DESC, id DESC', [studentId]);
  const lessons = await query(
    `SELECT l.id, l.starts_at, l.status, t.name AS teacher_name FROM lessons l JOIN users t ON t.id=l.teacher_id
     WHERE l.student_id=$1 AND l.status IN ('realizada','faltou','agendada') ORDER BY l.starts_at`, [studentId]);
  const purchased = payments.reduce((a, p) => a + p.credits, 0);
  const consumed = lessons.filter(l => l.status !== 'agendada');
  const scheduled = lessons.filter(l => l.status === 'agendada');
  const history = consumed.map((l, i) => ({ ...l, paid: i < purchased }));
  const pending = Math.max(0, consumed.length - purchased);
  const balance = Math.max(0, purchased - consumed.length);
  const scheduledUncovered = Math.max(0, scheduled.length - balance);
  return {
    payments, purchased, used: consumed.length, balance, pending,
    scheduled: scheduled.length, scheduledUncovered,
    history: history.reverse(),
  };
}
