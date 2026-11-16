import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { q, fetchLessons, dayRange, today, useData } from '../../lib';
import { addDays } from '../../dates';
import { Async, LessonList } from '../../components';

export default function AdminAulas() {
  const [f, setF] = useState({ de: addDays(today(), -7), ate: addDays(today(), 30), prof: '' });
  const teachers = useData(() => q(supabase.from('profiles').select('id,name').eq('role', 'teacher').order('name')), []);
  const state = useData(() => fetchLessons({ from: dayRange(f.de).from, to: dayRange(f.ate).to, teacherId: f.prof || undefined }), [f.de, f.ate, f.prof]);
  return (
    <>
      <h1>Aulas</h1>
      <p><Link className="btn" to="/admin/aulas/nova">+ Agendar aula</Link></p>
      <div className="row card">
        <label>De<input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></label>
        <label>Até<input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></label>
        <label>Professor<select value={f.prof} onChange={(e) => setF({ ...f, prof: e.target.value })}><option value="">Todos</option>{teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      </div>
      <Async state={state}>{(lessons) => <LessonList lessons={lessons} mode="admin" onChange={state.reload} empty="Nenhuma aula no período." />}</Async>
    </>
  );
}
