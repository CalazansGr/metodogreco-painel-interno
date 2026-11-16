// Fuso fixo de Brasília (UTC-3, sem horário de verão).
export const TZ = 'America/Sao_Paulo';
const OFFSET = '-03:00';

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// "2026-11-20" + "14:30" -> Date (instante correto)
export function toInstant(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr.slice(0, 5)}:00${OFFSET}`);
}

export function fmtDateTime(d) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}
export function fmtDate(d) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(d));
}
export function fmtTime(d) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}
export function ymd(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}
export function weekdayOf(dateStr) {
  return new Date(`${dateStr}T12:00:00${OFFSET}`).getUTCDay();
}
export function todayYmd() { return ymd(new Date()); }
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}
