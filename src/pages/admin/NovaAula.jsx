import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, useData, today } from '../../lib';
import { Async, BookingForm } from '../../components';

export default function NovaAula() {
  const nav = useNavigate();
  const state = useData(async () => {
    const [students, teachers] = await Promise.all([
      q(supabase.from('students').select('id,name').eq('active', true).order('name')),
      q(supabase.from('profiles').select('id,name').eq('role', 'teacher').eq('active', true).order('name')),
    ]);
    return { students, teachers };
  }, []);
  return (
    <>
      <h1>Agendar aula</h1>
      <p className="muted">Use quando o pai pedir pelo WhatsApp ou telefone: a aula entra na agenda do professor.</p>
      <div className="card">
        <Async state={state}>{({ students, teachers }) => (
          students.length === 0 || teachers.length === 0
            ? <p>Cadastre ao menos um aluno e um professor (com horários) antes.</p>
            : <BookingForm admin students={students} teachers={teachers} today={today()} onDone={() => nav('/admin/aulas')} />
        )}</Async>
      </div>
    </>
  );
}
