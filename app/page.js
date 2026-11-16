import { redirect } from 'next/navigation';
import { getSession, HOME } from '@/lib/auth';

export default async function Home() {
  const s = await getSession();
  redirect(s ? HOME[s.role] : '/login');
}
