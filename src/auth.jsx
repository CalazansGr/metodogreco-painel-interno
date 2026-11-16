import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const readMode = () => {
  try { return JSON.parse(sessionStorage.getItem('greco_mode') || localStorage.getItem('greco_mode')); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = carregando
  const [profile, setProfile] = useState(undefined);
  const [mode, setModeState] = useState(readMode); // família: { type: 'guardian' } | { type: 'student', studentId, studentName }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!uid) { setProfile(null); return; }
    setProfile(undefined);
    supabase.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data || null));
  }, [uid, session === undefined]);

  // remember=true guarda a escolha neste aparelho (abre direto no painel escolhido)
  const setMode = useCallback((m, remember = false) => {
    try {
      if (m) {
        sessionStorage.setItem('greco_mode', JSON.stringify(m));
        remember ? localStorage.setItem('greco_mode', JSON.stringify(m)) : localStorage.removeItem('greco_mode');
      } else { sessionStorage.removeItem('greco_mode'); localStorage.removeItem('greco_mode'); }
    } catch { /* ignora */ }
    setModeState(m);
  }, []);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = async () => { setMode(null); await supabase.auth.signOut(); };

  const loading = session === undefined || (session && profile === undefined);
  return <Ctx.Provider value={{ session, profile, loading, mode, setMode, signIn, signOut }}>{children}</Ctx.Provider>;
}
