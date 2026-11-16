import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, today } from '../../lib';
import { Async, BookingForm } from '../../components';
import { useFamilyStudents } from './shared';

export default function Agendar() {
  const nav = useNavigate();
  const st = useFamilyStudents();
  const teachers = useData(async () => {
    const [profiles, av] = await Promise.all([
      q(supabase.from('profiles').select('id,name').eq('role', 'teacher').eq('active', true).order('name')),
      q(supabase.from('availability').select('teacher_id')),
    ]);
    const withAv = new Set(av.map((a) => a.teacher_id));
    return profiles.filter((p) => withAv.has(p.id));
  }, []);

  if (!st.loading && !st.isGuardian) return <Navigate to="/familia" replace />;
  return (
    <>
      <h1>Agendar aula</h1>
      <p className="muted">Escolha o aluno, o professor e um horário livre. Se preferir, também pode pedir pelo WhatsApp.</p>
      <div className="card">
        <Async state={teachers}>{(t) => (
          st.data && (st.data.length === 0 || t.length === 0)
            ? <p>Ainda não há alunos ou professores com horários cadastrados. Fale com a escola.</p>
            : st.data && <BookingForm students={st.data} teachers={t} today={today()} onDone={() => nav('/familia')} />
        )}</Async>
      </div>
    </>
  );
}
