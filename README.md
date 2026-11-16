# Método Greco — Painel Interno

Endereço no GitHub Pages: `https://calazansgr.github.io/metodogreco-painel-interno/`

Site estático (Vite + React) no **GitHub Pages**, com **Supabase** para login, banco de dados e segurança (RLS).
Perfis: administrador, professor e família (pais + alunos no mesmo login).

## Como funciona a segurança
O site roda no navegador, então **toda a proteção está no banco** (`supabase/schema.sql`):
- Famílias só enxergam os próprios filhos, aulas e pagamentos; professores só os alunos com quem têm aula.
- Escrever aulas só é possível pelas funções `book_lesson` e `set_lesson_status`, que checam permissão, horário do professor e conflitos.
- Todo cadastro novo nasce **sem acesso** (`role = none`); só o admin libera.
- A "anon key" do Supabase é pública por desenho. **Nunca** use a `service_role key` no site.
- Teste as regras: `npm run test:rls` (47 verificações num Postgres local).

## Colocar no ar (tudo gratuito)

### 1. Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor > New query**: cole todo o `supabase/schema.sql` e rode.
3. **Authentication > Providers > Email**: desative **Confirm email** (o admin cria as contas das famílias).
4. **Authentication > Users > Add user**: crie o seu usuário. Depois, no SQL Editor:
   ```sql
   update public.profiles set role = 'admin', name = 'Seu Nome' where email = 'seu@email.com';
   ```
5. **Project Settings > API**: copie a *Project URL* e a *anon public key*.

### 2. GitHub
1. No repositório: **Settings > Secrets and variables > Actions > Variables**, crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os valores do passo 5 acima).
2. **Settings > Pages > Source: GitHub Actions**.
3. Faça push na branch `main`: o site é publicado em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
   > GitHub Pages em repositório **privado** exige plano pago do GitHub; no plano gratuito o repositório precisa ser público (não há segredos nele).

### 3. Evitar pausa do plano gratuito
O workflow `keepalive.yml` chama o banco todo dia. Observação: o GitHub desativa tarefas agendadas após 60 dias sem atividade no repositório — se isso acontecer, reative em **Actions**.
Faça também backups periódicos (Supabase > Database > Backups, ou exporte as tabelas).

## Rodar localmente
```
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev
```

## Regras de pagamento
- O admin registra pacotes pagos (nº de aulas) em Alunos > aluno > Registrar pagamento.
- Aula **realizada** ou **faltou** consome 1 crédito; os créditos cobrem as aulas mais antigas primeiro.
- O que excede os créditos aparece como **pendente** para os pais.

## Limites conhecidos
- A troca "Responsável / Aluno" é só da interface: o login é um só por família, então um aluno com a senha poderia entrar como responsável.
- Redefinir a senha de alguém é feito no painel do Supabase (Authentication > Users). Cada pessoa pode trocar a própria em "Minha senha".
