'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, one } from '@/lib/db';
import { createSession, destroySession, getSession, HOME } from '@/lib/auth';
import { createLesson } from '@/lib/lessons';
import { toInstant } from '@/lib/dates';

const s = (fd, k) => (fd.get(k) ?? '').toString().trim();
const back = (path, params) => redirect(`${path}?${new URLSearchParams(params)}`);

async function need(...roles) {
  const sess = await getSession();
  if (!sess || !roles.includes(sess.role)) redirect('/login');
  return sess;
}

// ---------- Autenticação ----------
export async function login(_prev, fd) {
  const email = s(fd, 'email').toLowerCase();
  const user = await one('SELECT * FROM users WHERE email=$1 AND active', [email]);
  if (!user || !bcrypt.compareSync(s(fd, 'password'), user.password_hash)) return { error: 'E-mail ou senha incorretos.' };
  await createSession({ uid: user.id, role: user.role, name: user.name });
  redirect(user.role === 'family' ? '/familia/perfil' : HOME[user.role]);
}

export async function logout() {
  await destroySession();
  redirect('/login');
}

// Família escolhe quem está usando: responsável ou um dos alunos
export async function chooseProfile(fd) {
  const sess = await need('family');
  const type = s(fd, 'type');
  let profile = { type: 'guardian' };
  if (type === 'student') {
    const st = await one('SELECT id, name FROM students WHERE id=$1 AND family_id=$2', [Number(s(fd, 'studentId')), sess.uid]);
    if (!st) redirect('/familia/perfil');
    profile = { type: 'student', studentId: st.id, studentName: st.name };
  }
  await createSession({ uid: sess.uid, role: 'family', name: sess.name, profile });
  redirect('/familia');
}

// ---------- Aulas ----------
export async function bookLesson(fd) {
  const sess = await need('family', 'admin');
  const studentId = Number(s(fd, 'studentId'));
  const teacherId = Number(s(fd, 'teacherId'));
  const startsAt = s(fd, 'startsAt');
  const base = sess.role === 'admin' ? '/admin/aulas/nova' : '/familia/agendar';

  const st = await one('SELECT * FROM students WHERE id=$1 AND active', [studentId]);
  if (!st || (sess.role === 'family' && (st.family_id !== sess.uid || sess.profile?.type !== 'guardian'))) redirect(sess.role === 'admin' ? '/admin' : '/familia');
  if (!startsAt || !teacherId) back(base, { erro: 'Escolha o professor, a data e o horário.' });

  const source = sess.role === 'admin' ? (s(fd, 'source') === 'whatsapp' ? 'whatsapp' : 'admin') : 'site';
  const r = await createLesson({ studentId, teacherId, startsAt, source, topic: s(fd, 'topic'), createdBy: sess.uid });
  if (!r.ok) back(base, { erro: r.error });
  revalidatePath('/', 'layout');
  redirect(sess.role === 'admin' ? '/admin/aulas?ok=1' : '/familia?ok=1');
}

export async function setLessonStatus(fd) {
  const sess = await need('admin', 'teacher', 'family');
  const id = Number(s(fd, 'id'));
  const status = s(fd, 'status');
  if (!['agendada', 'realizada', 'cancelada', 'faltou'].includes(status)) return;
  const l = await one('SELECT l.*, st.family_id FROM lessons l JOIN students st ON st.id=l.student_id WHERE l.id=$1', [id]);
  if (!l) return;
  if (sess.role === 'teacher' && l.teacher_id !== sess.uid) return;
  if (sess.role === 'family') {
    // Família só pode cancelar aulas futuras da própria família, com 2h de antecedência
    if (l.family_id !== sess.uid || sess.profile?.type !== 'guardian' || status !== 'cancelada') return;
    if (new Date(l.starts_at).getTime() - Date.now() < 2 * 3600 * 1000) return;
  }
  await query('UPDATE lessons SET status=$1 WHERE id=$2', [status, id]);
  revalidatePath('/', 'layout');
}

export async function addNote(fd) {
  const sess = await need('admin', 'teacher');
  const studentId = Number(s(fd, 'studentId'));
  const content = s(fd, 'content');
  if (!content || !(await teacherOwnsStudent(sess, studentId))) return;
  const lessonId = s(fd, 'lessonId') ? Number(s(fd, 'lessonId')) : null;
  await query('INSERT INTO student_notes(student_id,teacher_id,lesson_id,content,visible_to_family) VALUES($1,$2,$3,$4,$5)',
    [studentId, sess.uid, lessonId, content, fd.get('visible') === 'on']);
  revalidatePath('/', 'layout');
}

// ---------- Administração ----------
export async function createFamily(fd) {
  await need('admin');
  const email = s(fd, 'email').toLowerCase();
  if (await one('SELECT 1 AS x FROM users WHERE email=$1', [email])) back('/admin/familias/nova', { erro: 'Já existe um usuário com esse e-mail.' });
  const pass = s(fd, 'password') || 'greco123';
  const fam = await one('INSERT INTO users(role,name,email,phone,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id',
    ['family', s(fd, 'familyName'), email, s(fd, 'phone') || null, bcrypt.hashSync(pass, 10)]);
  if (s(fd, 'guardianName')) await query('INSERT INTO guardians(family_id,name,relationship,phone) VALUES($1,$2,$3,$4)', [fam.id, s(fd, 'guardianName'), s(fd, 'relationship') || null, s(fd, 'phone') || null]);
  if (s(fd, 'studentName')) await query('INSERT INTO students(family_id,name,birth_date,school,grade,level) VALUES($1,$2,$3,$4,$5,$6)',
    [fam.id, s(fd, 'studentName'), s(fd, 'birth') || null, s(fd, 'school') || null, s(fd, 'grade') || null, s(fd, 'level') || null]);
  redirect('/admin/familias');
}

export async function addStudent(fd) {
  await need('admin');
  const fam = Number(s(fd, 'familyId'));
  await query('INSERT INTO students(family_id,name,birth_date,school,grade,level) VALUES($1,$2,$3,$4,$5,$6)',
    [fam, s(fd, 'studentName'), s(fd, 'birth') || null, s(fd, 'school') || null, s(fd, 'grade') || null, s(fd, 'level') || null]);
  revalidatePath('/admin', 'layout');
}

export async function addGuardian(fd) {
  await need('admin');
  await query('INSERT INTO guardians(family_id,name,relationship,phone) VALUES($1,$2,$3,$4)',
    [Number(s(fd, 'familyId')), s(fd, 'name'), s(fd, 'relationship') || null, s(fd, 'phone') || null]);
  revalidatePath('/admin', 'layout');
}

async function teacherOwnsStudent(sess, studentId) {
  if (sess.role === 'admin') return true;
  return !!(await one('SELECT 1 AS x FROM lessons WHERE student_id=$1 AND teacher_id=$2 LIMIT 1', [studentId, sess.uid]));
}

export async function updateStudent(fd) {
  const sess = await need('admin', 'teacher');
  if (!(await teacherOwnsStudent(sess, Number(s(fd, 'id'))))) return;
  await query('UPDATE students SET name=$1, birth_date=$2, school=$3, grade=$4, level=$5, goals=$6, health_notes=$7 WHERE id=$8',
    [s(fd, 'name'), s(fd, 'birth') || null, s(fd, 'school') || null, s(fd, 'grade') || null, s(fd, 'level') || null, s(fd, 'goals') || null, s(fd, 'health') || null, Number(s(fd, 'id'))]);
  revalidatePath('/', 'layout');
}

export async function addPayment(fd) {
  const sess = await need('admin');
  const credits = parseInt(s(fd, 'credits'), 10);
  const amount = Math.round(parseFloat(s(fd, 'amount').replace(',', '.') || '0') * 100);
  if (!(credits > 0) || isNaN(amount)) return;
  await query('INSERT INTO payments(student_id,credits,amount_cents,method,note,paid_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [Number(s(fd, 'studentId')), credits, amount, s(fd, 'method') || null, s(fd, 'note') || null, s(fd, 'paidAt') || new Date().toISOString().slice(0, 10), sess.uid]);
  revalidatePath('/', 'layout');
}

export async function removePayment(fd) {
  await need('admin');
  await query('DELETE FROM payments WHERE id=$1', [Number(s(fd, 'id'))]);
  revalidatePath('/', 'layout');
}

export async function createTeacher(fd) {
  await need('admin');
  const email = s(fd, 'email').toLowerCase();
  if (await one('SELECT 1 AS x FROM users WHERE email=$1', [email])) back('/admin/professores', { erro: 'Já existe um usuário com esse e-mail.' });
  await query('INSERT INTO users(role,name,email,phone,password_hash) VALUES($1,$2,$3,$4,$5)',
    ['teacher', s(fd, 'name'), email, s(fd, 'phone') || null, bcrypt.hashSync(s(fd, 'password') || 'greco123', 10)]);
  revalidatePath('/admin', 'layout');
}

export async function addAvailability(fd) {
  const sess = await need('admin', 'teacher');
  const teacherId = sess.role === 'teacher' ? sess.uid : Number(s(fd, 'teacherId'));
  const start = s(fd, 'start'), end = s(fd, 'end');
  if (!start || !end || start >= end) return;
  await query('INSERT INTO availability(teacher_id,weekday,start_time,end_time) VALUES($1,$2,$3,$4)', [teacherId, Number(s(fd, 'weekday')), start, end]);
  revalidatePath('/', 'layout');
}

export async function removeAvailability(fd) {
  const sess = await need('admin', 'teacher');
  const id = Number(s(fd, 'id'));
  if (sess.role === 'teacher') await query('DELETE FROM availability WHERE id=$1 AND teacher_id=$2', [id, sess.uid]);
  else await query('DELETE FROM availability WHERE id=$1', [id]);
  revalidatePath('/', 'layout');
}

export async function resetPassword(fd) {
  await need('admin');
  const pass = s(fd, 'password');
  if (pass.length < 6) return;
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(pass, 10), Number(s(fd, 'userId'))]);
  revalidatePath('/admin', 'layout');
}

export async function toggleActive(fd) {
  await need('admin');
  await query('UPDATE users SET active = NOT active WHERE id=$1 AND role <> $2', [Number(s(fd, 'userId')), 'admin']);
  revalidatePath('/admin', 'layout');
}
