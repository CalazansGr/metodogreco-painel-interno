import { notFound } from 'next/navigation';
import { one } from '@/lib/db';
import { updateStudent, addPayment } from '@/app/actions';
import { lessonsBetween } from '@/lib/lessons';
import StudentSheet from '@/components/StudentSheet';
import BillingSummary from '@/components/BillingSummary';
import NoteForm from '@/components/NoteForm';
import LessonCard from '@/components/LessonCard';

export const dynamic = 'force-dynamic';

export default async function AlunoAdmin({ params }) {
  const { id } = await params;
  const st = await one('SELECT * FROM students WHERE id=$1', [Number(id)]);
  if (!st) notFound();
  const lessons = (await lessonsBetween({ studentIds: [st.id] })).reverse().slice(0, 10);
  const birth = st.birth_date ? new Date(st.birth_date).toISOString().slice(0, 10) : '';
  return (
    <>
      <h1>{st.name}</h1>
      <StudentSheet student={st} internal />
      <NoteForm studentId={st.id} />

      <h2>Editar ficha</h2>
      <form action={updateStudent} className="card stack">
        <input type="hidden" name="id" value={st.id} />
        <div className="row">
          <label>Nome<input name="name" defaultValue={st.name} required /></label>
          <label>Nascimento<input type="date" name="birth" defaultValue={birth} /></label>
          <label>Escola<input name="school" defaultValue={st.school || ''} /></label>
          <label>Série<input name="grade" defaultValue={st.grade || ''} /></label>
          <label>Nível<input name="level" defaultValue={st.level || ''} placeholder="Coragem / Aprendiz / Aventura" /></label>
        </div>
        <label>Objetivos<textarea name="goals" defaultValue={st.goals || ''} /></label>
        <label>Saúde / pontos de atenção (interno)<textarea name="health" defaultValue={st.health_notes || ''} /></label>
        <div><button className="btn">Salvar ficha</button></div>
      </form>

      <h2>Pagamentos</h2>
      <BillingSummary student={st} admin />
      <form action={addPayment} className="card stack">
        <h3>Registrar pagamento</h3>
        <input type="hidden" name="studentId" value={st.id} />
        <div className="row">
          <label>Nº de aulas pagas<input type="number" name="credits" min="1" defaultValue="4" required /></label>
          <label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="0,00" /></label>
          <label>Forma<select name="method"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option></select></label>
          <label>Data<input type="date" name="paidAt" /></label>
        </div>
        <label>Observação<input name="note" placeholder="Ex.: mensalidade de novembro" /></label>
        <div><button className="btn">Registrar</button></div>
      </form>

      <h2>Últimas aulas</h2>
      {lessons.map(l => <LessonCard key={l.id} l={l} mode="admin" />)}
    </>
  );
}
