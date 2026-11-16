import { fmtDateTime } from '@/lib/dates';
import { setLessonStatus } from '@/app/actions';

const LABEL = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada', faltou: 'Faltou' };
const SRC = { site: 'Site', whatsapp: 'WhatsApp', admin: 'Admin' };

function StatusBtn({ id, status, label, cls = 'ghost' }) {
  return (
    <form action={setLessonStatus} className="inline">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className={`btn small ${cls}`}>{label}</button>
    </form>
  );
}

// mode: 'admin' | 'teacher' | 'family'
export default function LessonCard({ l, mode, showStudentLink }) {
  const future = new Date(l.starts_at).getTime() > Date.now();
  const canFamilyCancel = mode === 'family' && l.status === 'agendada' && new Date(l.starts_at).getTime() - Date.now() >= 2 * 3600 * 1000;
  return (
    <div className="card lesson">
      <div>
        <div className="when">{fmtDateTime(l.starts_at)} <span className={`badge ${l.status}`}>{LABEL[l.status]}</span> {mode !== 'family' && <span className="badge src">{SRC[l.source]}</span>}</div>
        <div>
          {mode === 'teacher' || mode === 'admin' ? (
            showStudentLink ? <a href={`/${mode === 'admin' ? 'admin' : 'professor'}/alunos/${l.student_id}`}>{l.student_name}</a> : l.student_name
          ) : l.student_name}
          {mode !== 'teacher' && <span className="muted"> · com {l.teacher_name}</span>}
          <span className="muted"> · {l.duration_min} min</span>
        </div>
        {l.topic && <div className="muted">Assunto: {l.topic}</div>}
      </div>
      <div className="actions">
        {(mode === 'admin' || mode === 'teacher') && l.status === 'agendada' && (
          <>
            <StatusBtn id={l.id} status="realizada" label="Realizada" />
            <StatusBtn id={l.id} status="faltou" label="Faltou" />
            <StatusBtn id={l.id} status="cancelada" label="Cancelar" cls="danger" />
          </>
        )}
        {canFamilyCancel && <StatusBtn id={l.id} status="cancelada" label="Cancelar aula" cls="danger" />}
        {mode === 'family' && l.status === 'agendada' && future && !canFamilyCancel && <span className="muted">Para cancelar, fale com a escola.</span>}
      </div>
    </div>
  );
}
