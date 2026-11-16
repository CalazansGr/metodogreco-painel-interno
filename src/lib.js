import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { toInstant, weekdayOf } from './dates';

// Desembrulha { data, error } do Supabase
export const q = async (p) => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
};
export const rpc = (fn, args) => q(supabase.rpc(fn, args));

// Carrega dados assíncronos: { data, error, loading, reload }
export function useData(fn, deps = []) {
  const [state, setState] = useState({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let off = false;
    setState((s) => ({ ...s, loading: true }));
    fn().then(
      (data) => !off && setState({ data, loading: false }),
      (e) => !off && setState({ error: e.message || String(e), loading: false }),
    );
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

export const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtBirth = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');

// ---------- Aulas ----------
const LESSON_SEL = '*, student:students(id,name,family_id), teacher:profiles(id,name,phone)';

export function fetchLessons({ from, to, teacherId, studentIds, status, desc } = {}) {
  let query = supabase.from('lessons').select(LESSON_SEL).order('starts_at', { ascending: !desc });
  if (from) query = query.gte('starts_at', from);
  if (to) query = query.lt('starts_at', to);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (studentIds) query = query.in('student_id', studentIds);
  if (status) query = query.eq('status', status);
  return q(query);
}

export function dayRange(dateStr, days = 1) {
  const a = toInstant(dateStr, '00:00');
  return { from: a.toISOString(), to: new Date(a.getTime() + days * 86400000).toISOString() };
}

// Horários livres de um professor num dia (blocos de `duration` minutos)
export async function getSlots(teacherId, dateStr, duration = 60) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  const { from, to } = dayRange(dateStr);
  const [av, busy] = await Promise.all([
    q(supabase.from('availability').select('start_time,end_time').eq('teacher_id', teacherId).eq('weekday', weekdayOf(dateStr)).order('start_time')),
    rpc('busy_slots', { p_teacher: teacherId, p_from: from, p_to: to }),
  ]);
  const ranges = busy.map((b) => [new Date(b.starts_at).getTime(), new Date(b.starts_at).getTime() + b.duration_min * 60000]);
  const now = Date.now();
  const out = [];
  for (const a of av) {
    let t = toInstant(dateStr, a.start_time).getTime();
    const end = toInstant(dateStr, a.end_time).getTime();
    while (t + duration * 60000 <= end) {
      const e = t + duration * 60000;
      if (t > now && !ranges.some(([bs, be]) => t < be && e > bs)) out.push(new Date(t).toISOString());
      t += duration * 60000;
    }
  }
  return out;
}

// ---------- Créditos / pagamentos ----------
// Tudo em HORAS. Aula "realizada" ou "faltou" consome a duração da aula; as horas pagas
// cobrem as aulas mais antigas primeiro e o que passar disso fica pendente.
export const fmtH = (h) => Number(h || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const hrs = (l) => l.duration_min / 60;
const round = (n) => Math.round(n * 100) / 100;

export async function getBilling(studentId) {
  const [payments, lessons] = await Promise.all([
    q(supabase.from('payments').select('*').eq('student_id', studentId).order('paid_at', { ascending: false }).order('id', { ascending: false })),
    q(supabase.from('lessons').select('id,starts_at,duration_min,status,teacher:profiles(name)').eq('student_id', studentId).in('status', ['realizada', 'faltou', 'agendada']).order('starts_at')),
  ]);
  const purchased = round(payments.reduce((a, p) => a + Number(p.credits), 0));
  const consumed = lessons.filter((l) => l.status !== 'agendada');
  const scheduled = lessons.filter((l) => l.status === 'agendada');
  const used = round(consumed.reduce((a, l) => a + hrs(l), 0));
  let acc = 0;
  const history = consumed.map((l) => { acc += hrs(l); return { ...l, paid: acc <= purchased + 1e-9 }; }).reverse();
  const balance = round(Math.max(0, purchased - used));
  const scheduledH = round(scheduled.reduce((a, l) => a + hrs(l), 0));
  return {
    payments, purchased, used, balance,
    pending: round(Math.max(0, used - purchased)),
    scheduled: scheduledH,
    scheduledUncovered: round(Math.max(0, scheduledH - balance)),
    history,
  };
}

// Situação de crédito de todos os alunos de uma vez (usado nas listas do admin)
export async function getBillingMap() {
  const [payments, lessons] = await Promise.all([
    q(supabase.from('payments').select('student_id,credits')),
    q(supabase.from('lessons').select('student_id,status,duration_min').in('status', ['realizada', 'faltou', 'agendada'])),
  ]);
  const m = {};
  const get = (id) => (m[id] ||= { purchased: 0, consumed: 0, scheduled: 0 });
  payments.forEach((p) => { get(p.student_id).purchased += Number(p.credits); });
  lessons.forEach((l) => { l.status === 'agendada' ? (get(l.student_id).scheduled += hrs(l)) : (get(l.student_id).consumed += hrs(l)); });
  const out = {};
  for (const [id, v] of Object.entries(m)) {
    const balance = round(Math.max(0, v.purchased - v.consumed));
    out[id] = { balance, pending: round(Math.max(0, v.consumed - v.purchased)), scheduled: round(v.scheduled), scheduledUncovered: round(Math.max(0, v.scheduled - balance)) };
  }
  return new Proxy(out, { get: (t, k) => t[k] || { balance: 0, pending: 0, scheduled: 0, scheduledUncovered: 0 } });
}

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
