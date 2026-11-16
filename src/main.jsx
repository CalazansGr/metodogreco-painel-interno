import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import { AuthProvider, useAuth } from './auth';
import { configured } from './supabase';
import { Guard, SenhaPage } from './components';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import FamiliaHome from './pages/familia/Home';
import Agendar from './pages/familia/Agendar';
import Ficha from './pages/familia/Ficha';
import FamiliaPagamentos from './pages/familia/Pagamentos';
import AdminHome from './pages/admin/Home';
import AdminAulas from './pages/admin/Aulas';
import AdminNovaAula from './pages/admin/NovaAula';
import AdminAlunos from './pages/admin/Alunos';
import AdminAluno from './pages/admin/Aluno';
import AdminFamilias from './pages/admin/Familias';
import AdminNovaFamilia from './pages/admin/NovaFamilia';
import AdminProfessores from './pages/admin/Professores';
import AdminPagamentos from './pages/admin/Pagamentos';
import ProfHome from './pages/professor/Home';
import ProfAluno from './pages/professor/Aluno';
import ProfDisponibilidade from './pages/professor/Disponibilidade';

const HOME = { admin: '/admin', teacher: '/professor', family: '/familia' };

function Home() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="center"><p className="muted">Carregando…</p></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!HOME[profile.role]) return <Navigate to="/login?semacesso=1" replace />;
  return <Navigate to={HOME[profile.role]} replace />;
}

function Setup() {
  return (
    <div className="center"><div className="card login">
      <h1>Método <span style={{ color: 'var(--accent)' }}>Greco</span></h1>
      <p>O site ainda não está conectado ao Supabase. Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja o README).</p>
    </div></div>
  );
}

function App() {
  if (!configured) return <Setup />;
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/perfil" element={<Perfil />} />

          <Route path="/familia" element={<Guard role="family" />}>
            <Route index element={<FamiliaHome />} />
            <Route path="agendar" element={<Agendar />} />
            <Route path="ficha" element={<Ficha />} />
            <Route path="pagamentos" element={<FamiliaPagamentos />} />
            <Route path="senha" element={<SenhaPage />} />
          </Route>

          <Route path="/admin" element={<Guard role="admin" />}>
            <Route index element={<AdminHome />} />
            <Route path="aulas" element={<AdminAulas />} />
            <Route path="aulas/nova" element={<AdminNovaAula />} />
            <Route path="alunos" element={<AdminAlunos />} />
            <Route path="alunos/:id" element={<AdminAluno />} />
            <Route path="familias" element={<AdminFamilias />} />
            <Route path="familias/nova" element={<AdminNovaFamilia />} />
            <Route path="professores" element={<AdminProfessores />} />
            <Route path="pagamentos" element={<AdminPagamentos />} />
            <Route path="senha" element={<SenhaPage />} />
          </Route>

          <Route path="/professor" element={<Guard role="teacher" />}>
            <Route index element={<ProfHome />} />
            <Route path="alunos/:id" element={<ProfAluno />} />
            <Route path="disponibilidade" element={<ProfDisponibilidade />} />
            <Route path="senha" element={<SenhaPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
