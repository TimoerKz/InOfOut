'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, MapPin, Plus, Users, X } from 'lucide-react';

const initialEvents = [
  { id: 1, title: 'Pizza bij Sophie', topic: 'Eten', color: 'coral', date: '2026-09-11', time: '19:00', place: 'Sophie thuis', people: ['Sophie', 'Tijm', 'Lisa'], out: ['Milo'] },
  { id: 2, title: 'Lego bouwen', topic: 'Bouwen', color: 'purple', date: '2026-09-17', time: '14:00', place: 'Werkplaats Noord', people: ['Tijm', 'Milo'], out: ['Lisa'] },
  { id: 3, title: 'Verjaardag Lisa', topic: 'Feest', color: 'yellow', date: '2026-09-24', time: '20:00', place: 'Café De Zon', people: ['Lisa', 'Sophie'], out: ['Tijm'] },
  { id: 4, title: 'Samen eten', topic: 'Eten', color: 'coral', date: '2026-09-28', time: '18:30', place: 'Nog te bepalen', people: ['Sophie'], out: [] },
];

const months = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const weekdays = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
const isoWeek = (date) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - y) / 86400000) + 1) / 7); };
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function Home() {
  const [view, setView] = useState('Maand');
  const [cursor, setCursor] = useState(new Date(2026, 8, 1));
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('Alles');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', date: '2026-09-30', time: '19:00', topic: 'Eten' });
  const filtered = useMemo(() => filter === 'Alles' ? events : events.filter(e => e.topic === filter), [events, filter]);
  const changeMonth = (amount) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1));
  const vote = (answer) => {
    setEvents(events.map(event => event.id !== selected.id ? event : {
      ...event,
      people: answer === 'in' ? [...new Set([...event.people, 'Jij'])] : event.people.filter(p => p !== 'Jij'),
      out: answer === 'out' ? [...new Set([...event.out, 'Jij'])] : event.out.filter(p => p !== 'Jij'),
    }));
    setSelected(prev => ({ ...prev, people: answer === 'in' ? [...new Set([...prev.people, 'Jij'])] : prev.people.filter(p => p !== 'Jij'), out: answer === 'out' ? [...new Set([...prev.out, 'Jij'])] : prev.out.filter(p => p !== 'Jij') }));
  };
  const addEvent = (e) => { e.preventDefault(); const topicColors = { Eten: 'coral', Bouwen: 'purple', Feest: 'yellow' }; setEvents([...events, { id: Date.now(), ...form, color: topicColors[form.topic], place: 'Nog te bepalen', people: ['Jij'], out: [] }]); setShowNew(false); };

  return <main>
    <header><div className="brand"><span className="brand-mark">i/o</span><span>InOfOut</span></div><div className="group"><Users size={17}/><span>De Vrijdagclub</span><button aria-label="Groepsinstellingen"><CircleUserRound size={23}/></button></div></header>
    <section className="intro"><div><p className="eyebrow">GROEPSAGENDA</p><h1>Wanneer zien we elkaar?</h1><p className="subtle">Plan iets, stem snel en houd het gezellig simpel.</p></div><button className="primary" onClick={() => setShowNew(true)}><Plus size={19}/> Nieuwe activiteit</button></section>
    <nav className="toolbar"><div className="views">{['Jaar','Maand','Week'].map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</div><div className="month-nav"><button onClick={() => changeMonth(-1)}><ChevronLeft size={20}/></button><strong>{view === 'Jaar' ? cursor.getFullYear() : `${months[cursor.getMonth()]} ${cursor.getFullYear()}`}</strong><button onClick={() => changeMonth(1)}><ChevronRight size={20}/></button></div><div className="filters">{['Alles','Eten','Bouwen','Feest'].map(item => <button key={item} onClick={() => setFilter(item)} className={`filter ${filter === item ? 'selected' : ''}`}><i className={item === 'Alles' ? 'all' : item.toLowerCase()}></i>{item}</button>)}</div></nav>
    {view === 'Maand' && <MonthView cursor={cursor} events={filtered} onSelect={setSelected} />}
    {view === 'Week' && <WeekView cursor={cursor} events={filtered} onSelect={setSelected} />}
    {view === 'Jaar' && <YearView cursor={cursor} events={filtered} onSelect={setSelected} />}
    {selected && <EventPanel event={events.find(e => e.id === selected.id) || selected} onClose={() => setSelected(null)} onVote={vote}/>} 
    {showNew && <NewEvent form={form} setForm={setForm} onClose={() => setShowNew(false)} onSubmit={addEvent}/>}
  </main>;
}

function MonthView({ cursor, events, onSelect }) { const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const offset = (start.getDay() + 6) % 7; const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset); return <section className="calendar month">{weekdays.map(day => <div className="weekday" key={day}>{day}</div>)}{Array.from({length: 42}, (_, index) => { const day = new Date(first); day.setDate(first.getDate()+index); const key = dateKey(day); const dayEvents = events.filter(e => e.date === key); return <div className={`day ${day.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${key === '2026-09-27' ? 'today' : ''}`} key={key}><span className="week-number">{day.getDay() === 1 ? `W${isoWeek(day)}` : ''}</span><span className="date">{day.getDate()}</span>{dayEvents.map(event => <button key={event.id} onClick={() => onSelect(event)} className={`event ${event.color}`}>{event.time} <b>{event.title}</b></button>)}</div>})}</section> }
function WeekView({ cursor, events, onSelect }) { const monday = new Date(cursor); monday.setDate(cursor.getDate() - ((cursor.getDay()+6)%7)); return <section className="week-view"><div className="week-label">Week {isoWeek(monday)}</div>{Array.from({length:7}, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate()+index); const key = dateKey(day); return <div className="week-day" key={key}><p>{weekdays[index]} <b>{day.getDate()}</b></p>{events.filter(e=>e.date===key).map(e => <button key={e.id} onClick={() => onSelect(e)} className={`week-event ${e.color}`}><span>{e.time}</span>{e.title}</button>)}</div>})}</section> }
function YearView({cursor, events, onSelect}) { return <section className="year-view">{months.map((month, index) => <div className="mini-month" key={month}><h3>{month}</h3><div className="mini-days">{Array.from({length: new Date(cursor.getFullYear(),index+1,0).getDate()},(_, day) => { const key=`${cursor.getFullYear()}-${String(index+1).padStart(2,'0')}-${String(day+1).padStart(2,'0')}`; const event=events.find(e=>e.date===key); return <button onClick={() => event && onSelect(event)} className={event ? `has-event ${event.color}` : ''} key={key}>{day+1}</button>})}</div></div>)}</section> }
function EventPanel({event,onClose,onVote}) { const myVote = event.people.includes('Jij') ? 'in' : event.out.includes('Jij') ? 'out' : null; return <aside className="panel"><button className="close" onClick={onClose}><X size={21}/></button><p className="eyebrow">{event.topic}</p><h2>{event.title}</h2><p className="detail"><CalendarDays size={17}/>{new Date(`${event.date}T12:00`).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})} · {event.time}</p><p className="detail"><MapPin size={17}/>{event.place}</p><div className="vote"><p>Ben je erbij?</p><div><button onClick={() => onVote('in')} className={myVote==='in'?'yes chosen':'yes'}>In</button><button onClick={() => onVote('out')} className={myVote==='out'?'no chosen':'no'}>Out</button></div></div><div className="attendance"><p><b>{event.people.length} in</b> · {event.out.length} out</p><span>{event.people.join(', ') || 'Nog niemand'}</span></div></aside> }
function NewEvent({form,setForm,onClose,onSubmit}) { return <div className="modal-backdrop"><form className="new-event" onSubmit={onSubmit}><button type="button" className="close" onClick={onClose}><X size={21}/></button><p className="eyebrow">NIEUWE ACTIVITEIT</p><h2>Wat gaan jullie doen?</h2><label>Titel<input required autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Bijv. Samen eten"/></label><div className="form-row"><label>Datum<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Tijd<input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label></div><label>Onderwerp<select value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}><option>Eten</option><option>Bouwen</option><option>Feest</option></select></label><button className="primary" type="submit">Activiteit toevoegen</button></form></div> }
