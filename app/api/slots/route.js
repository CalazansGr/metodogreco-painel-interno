import { getSession } from '@/lib/auth';
import { getSlots } from '@/lib/lessons';

export async function GET(req) {
  const sess = await getSession();
  if (!sess) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const slots = await getSlots(Number(searchParams.get('teacher')), searchParams.get('date') || '');
  return Response.json({ slots });
}
