import { createFamily } from '@/app/actions';

export default async function NovaFamilia({ searchParams }) {
  const sp = await searchParams;
  return (
    <>
      <h1>Nova família</h1>
      {sp.erro && <div className="alert">{sp.erro}</div>}
      <form action={createFamily} className="card stack">
        <h3>Login da família</h3>
        <div className="row">
          <label>Nome da família<input name="familyName" placeholder="Família Souza" required /></label>
          <label>E-mail de acesso<input type="email" name="email" required /></label>
          <label>Senha inicial<input name="password" placeholder="greco123" /></label>
        </div>
        <h3>Responsável</h3>
        <div className="row">
          <label>Nome<input name="guardianName" /></label>
          <label>Parentesco<input name="relationship" placeholder="Mãe, Pai…" /></label>
          <label>WhatsApp<input name="phone" /></label>
        </div>
        <h3>Primeiro aluno</h3>
        <div className="row">
          <label>Nome<input name="studentName" /></label>
          <label>Nascimento<input type="date" name="birth" /></label>
          <label>Escola<input name="school" /></label>
          <label>Série<input name="grade" /></label>
          <label>Nível<input name="level" placeholder="Coragem / Aprendiz / Aventura" /></label>
        </div>
        <div><button className="btn">Criar família</button></div>
      </form>
    </>
  );
}
