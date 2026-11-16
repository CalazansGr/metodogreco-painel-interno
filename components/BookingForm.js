'use client';
import { useState, useEffect } from 'react';

const fmt = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

// students: [{id,name}], teachers: [{id,name}]; admin = mostra opção de origem (WhatsApp)
export default function BookingForm({ action, students, teachers, admin = false, today }) {
  const [teacher, setTeacher] = useState(teachers[0]?.id || '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSlot('');
    if (!teacher || !date) { setSlots([]); return; }
    let off = false;
    setLoading(true);
    fetch(`/api/slots?teacher=${teacher}&date=${date}`).then(r => r.json()).then(d => { if (!off) setSlots(d.slots || []); }).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [teacher, date]);

  return (
    <form action={action} className="stack">
      <div className="row">
        <label>Aluno
          <select name="studentId" required>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label>Professor
          <select name="teacherId" value={teacher} onChange={e => setTeacher(e.target.value)} required>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>Data
          <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} required />
        </label>
      </div>

      <div>
        <div className="muted" style={{ marginBottom: '.4rem' }}>Horários disponíveis</div>
        {!date ? <span className="muted">Escolha uma data.</span> : loading ? <span className="muted">Buscando…</span> :
          slots.length === 0 ? <span className="muted">Nenhum horário livre nesse dia. Tente outra data ou outro professor.</span> :
            <div className="slots">{slots.map(s => (
              <button type="button" key={s} className={`slot ${slot === s ? 'sel' : ''}`} onClick={() => setSlot(s)}>{fmt(s)}</button>
            ))}</div>}
        <input type="hidden" name="startsAt" value={slot} />
      </div>

      <label>Assunto / dificuldade (opcional)<input name="topic" placeholder="Ex.: frações, prova de sexta" /></label>
      {admin && (
        <label>Como foi pedido?
          <select name="source"><option value="whatsapp">WhatsApp</option><option value="admin">Presencial / telefone</option></select>
        </label>
      )}
      <button className="btn" disabled={!slot}>Confirmar agendamento</button>
    </form>
  );
}
