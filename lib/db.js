// Banco: Neon (Postgres) em produção; PGlite (Postgres local em arquivo) se não houver DATABASE_URL.
let impl;

async function getImpl() {
  if (impl) return impl;
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    impl = async (text, params = []) => sql.query(text, params);
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const g = globalThis;
    if (!g.__pglite) g.__pglite = new PGlite('./.pglite');
    const db = g.__pglite;
    impl = async (text, params = []) => (await db.query(text, params)).rows;
  }
  return impl;
}

export async function query(text, params = []) {
  const run = await getImpl();
  return run(text, params);
}

export async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}
