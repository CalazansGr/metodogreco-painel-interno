import { supabase } from '../../supabase';
import { q, useData } from '../../lib';
import { useAuth } from '../../auth';

// Alunos visíveis no perfil atual (responsável: todos da família; aluno: só ele)
export function useFamilyStudents() {
  const { mode } = useAuth();
  const state = useData(() => q(supabase.from('students').select('*').eq('active', true).order('name')), []);
  const isGuardian = mode?.type === 'guardian';
  const data = state.data && (isGuardian ? state.data : state.data.filter((s) => s.id === mode?.studentId));
  return { ...state, data, isGuardian };
}
