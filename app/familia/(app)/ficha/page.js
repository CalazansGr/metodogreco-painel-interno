import { familyContext } from '@/lib/family';
import StudentSheet from '@/components/StudentSheet';

export const dynamic = 'force-dynamic';

export default async function Ficha() {
  const { students } = await familyContext();
  return (
    <>
      <h1>Ficha do aluno</h1>
      {students.map(s => <StudentSheet key={s.id} student={s} />)}
    </>
  );
}
