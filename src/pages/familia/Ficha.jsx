import { Async, StudentSheet } from '../../components';
import { useFamilyStudents } from './shared';

export default function Ficha() {
  const st = useFamilyStudents();
  return (
    <>
      <h1>Ficha do aluno</h1>
      <Async state={st}>{(students) => students.map((s) => <StudentSheet key={s.id} student={s} />)}</Async>
    </>
  );
}
