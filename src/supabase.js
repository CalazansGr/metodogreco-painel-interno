import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);
export const supabase = createClient(url || 'http://localhost', key || 'sem-chave');

// Cria uma conta nova SEM trocar a sessão de quem está logado (usado pelo admin).
// A conta nasce sem permissões; em seguida o admin define o papel em "profiles".
export async function adminSignUp(email, password, name) {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw new Error(error.message.includes('already') ? 'Já existe um usuário com esse e-mail.' : error.message);
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) throw new Error('Já existe um usuário com esse e-mail.');
  return data.user;
}
