import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-local');
const COOKIE = 'greco_session';

export async function createSession(payload) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('14d').sign(secret());
  const c = await cookies();
  c.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 14 });
}

export async function getSession() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, secret())).payload; } catch { return null; }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const HOME = { admin: '/admin', teacher: '/professor', family: '/familia' };

// role: 'admin' | 'teacher' | 'family'
export async function requireRole(role) {
  const s = await getSession();
  if (!s) redirect('/login');
  if (s.role !== role) redirect(HOME[s.role] || '/login');
  return s;
}
