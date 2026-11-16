import { readFileSync, existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';

// carrega .env.local / .env manualmente
for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]] && m[2]) process.env[m[1]] = m[2];
  }
}
const { SCHEMA } = await import('../lib/schema.js');
const { query, one } = await import('../lib/db.js');

for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await query(stmt);
console.log('Tabelas criadas/atualizadas.');

const hash = (p) => bcrypt.hashSync(p, 10);
async function ensureUser(role, name, email, pass, phone = null) {
  const ex = await one('SELECT id FROM users WHERE email=$1', [email]);
  if (ex) return ex.id;
  return (await one('INSERT INTO users(role,name,email,phone,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id', [role, name, email, phone, hash(pass)])).id;
}

const adminEmail = process.env.ADMIN_EMAIL || 'admin@metodogreco.com';
const adminPass = process.env.ADMIN_PASSWORD || 'greco123';
await ensureUser('admin', 'Administrador', adminEmail, adminPass);
console.log(`Admin: ${adminEmail}  (senha: ${process.env.ADMIN_PASSWORD ? 'a definida em ADMIN_PASSWORD' : adminPass} - troque!)`);

if (process.argv.includes('--seed')) {
  const prof = await ensureUser('teacher', 'Prof. Ana Souza', 'ana@metodogreco.com', 'greco123', '11999990001');
  if (!(await one('SELECT 1 AS x FROM availability WHERE teacher_id=$1', [prof]))) {
    for (const wd of [1, 2, 3, 4, 5]) await query('INSERT INTO availability(teacher_id,weekday,start_time,end_time) VALUES($1,$2,$3,$4)', [prof, wd, '14:00', '18:00']);
  }
  const fam = await ensureUser('family', 'Família Silva', 'silva@exemplo.com', 'greco123', '11999990002');
  if (!(await one('SELECT 1 AS x FROM students WHERE family_id=$1', [fam]))) {
    await query('INSERT INTO guardians(family_id,name,relationship,phone) VALUES($1,$2,$3,$4)', [fam, 'Marta Silva', 'Mãe', '11999990002']);
    await query('INSERT INTO students(family_id,name,birth_date,school,grade,level,goals) VALUES($1,$2,$3,$4,$5,$6,$7)', [fam, 'Pedro Silva', '2014-05-10', 'Escola Aurora', '6º ano', 'Aprendiz', 'Reforço em frações e geometria']);
  }
  console.log('Dados de exemplo: ana@metodogreco.com e silva@exemplo.com (senha greco123)');
}
process.exit(0);
