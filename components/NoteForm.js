import { addNote } from '@/app/actions';

export default function NoteForm({ studentId }) {
  return (
    <form action={addNote} className="card stack">
      <h3>Nova observação</h3>
      <input type="hidden" name="studentId" value={studentId} />
      <textarea name="content" placeholder="Como foi a aula, dificuldades, tarefa de casa…" required />
      <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 500 }}>
        <input type="checkbox" name="visible" defaultChecked style={{ width: 'auto' }} /> Visível para os pais
      </label>
      <div><button className="btn">Salvar observação</button></div>
    </form>
  );
}
