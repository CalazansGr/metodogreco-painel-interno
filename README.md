# Método Greco — Sistema de aulas

Next.js + Postgres (Neon, gratuito). Perfis: administrador, professor e família (pais + alunos no mesmo login).

## Rodar localmente (sem criar conta nenhuma)
```
npm install
npm run db:seed     # cria banco local (.pglite) + dados de exemplo
npm run dev         # http://localhost:3000
```
Logins de exemplo (senha `greco123`): `admin@metodogreco.com`, `ana@metodogreco.com` (professora), `silva@exemplo.com` (família).

## Publicar (tudo gratuito)
1. **Banco:** crie um projeto em https://neon.tech e copie a *connection string*.
2. **Variáveis:** `DATABASE_URL` (Neon), `SESSION_SECRET` (texto longo aleatório), `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
3. Rode uma vez com essas variáveis: `npm run db:setup` (cria tabelas e o admin; use `db:seed` só para testar).
4. **Hospedagem:** suba o projeto na Vercel, configure as mesmas variáveis e faça o deploy.

## Regras de pagamento
- O admin registra pacotes pagos (nº de aulas) em Alunos > aluno > Registrar pagamento.
- Aula **realizada** ou **faltou** consome 1 crédito; os créditos cobrem as aulas mais antigas primeiro.
- O que excede os créditos aparece como **pendente** para os pais, em Pagamentos.

## Backup
No Neon: Branches/Backups, ou `pg_dump` periódico com a connection string.
