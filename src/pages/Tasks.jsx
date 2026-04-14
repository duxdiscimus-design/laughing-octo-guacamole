import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DAYS_OF_WEEK, ROLES } from '../constants';

const DEFAULT_TASKS = {
  prebuilt: {
    morningTillSetup: { name: 'Morning Till Setup', enabled: false, schedule: 'daily', time: '07:00', duration: 30, staff: 1, notes: 'LOD overlap recommended' },
    endOfDaySafeCount: { name: 'End of Day Safe Count', enabled: false, schedule: 'atClose', time: null, duration: 30, staff: 1, notes: 'LOD overlap recommended' },
    truckUnload: { name: 'Truck Unload', enabled: false, schedule: 'oneoff', time: '06:00', duration: 0, staff: 3, notes: '~50% Thursdays, variable duration' },
    morningHuddle: { name: 'Morning Huddle', enabled: false, schedule: 'daily', time: '07:45', duration: 15, staff: 0, notes: 'Leaders, soft reminder' },
    mondayConferenceCall: { name: 'Monday Conference Call', enabled: false, schedule: 'weekly-Mon', time: '14:00', duration: 120, staff: 0, notes: 'SM and/or AMs' },
  },
  recurring: [],
  oneoff: [],
  templates: [],
};

const SCHEDULE_LABELS = {
  daily: 'Daily',
  atClose: 'Daily at store close',
  oneoff: 'One-off (Thu ~50%)',
  'weekly-Mon': 'Every Monday',
};

function formatDuration(min) {
  if (!min) return 'Variable';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function newRecurring() {
  return { id: crypto.randomUUID(), name: '', days: [], time: '08:00', durationH: 0, durationM: 30, minStaff: 1, role: '' };
}

function newOneoff() {
  return { id: crypto.randomUUID(), name: '', date: '', time: '08:00', durationH: 0, durationM: 30, minStaff: 1, role: '' };
}

function TaskCard({ label, task, onToggle, onSaveTemplate }) {
  return (
    <div className="rounded-xl p-4 border border-[#2a2a32] bg-[#1a1a1f] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white">{task.name}</span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${task.enabled ? 'bg-green-500' : 'bg-[#2a2a32]'}`}
          style={{ minWidth: 44, minHeight: 24 }}
          aria-label={`Toggle ${task.name}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${task.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <div className="text-sm text-[#a0a0b0] grid grid-cols-2 gap-1">
        <span>📅 {SCHEDULE_LABELS[task.schedule] || task.schedule}</span>
        {task.time && <span>🕐 {task.time}</span>}
        <span>⏱ {formatDuration(task.duration)}</span>
        {task.staff > 0 && <span>👥 {task.staff} staff min</span>}
        {task.notes && <span className="col-span-2 italic text-[#7070a0]">{task.notes}</span>}
      </div>
      <button
        onClick={onSaveTemplate}
        className="self-start text-xs px-3 py-1 rounded bg-[#2a2a32] text-[#a0a0b0] hover:bg-[#3a3a4a] transition-colors mt-1"
        style={{ minHeight: 44 }}
      >
        💾 Save as Template
      </button>
    </div>
  );
}

function RecurringForm({ item, onChange, onDelete, onSave }) {
  return (
    <div className="rounded-xl p-4 border border-[#2a2a32] bg-[#1a1a1f] flex flex-col gap-3">
      <input
        className="bg-[#0f0f11] border border-[#2a2a32] rounded px-3 py-2 text-white text-sm w-full"
        placeholder="Task name"
        value={item.name}
        onChange={e => onChange({ ...item, name: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map(d => (
          <label key={d} className="flex items-center gap-1 text-sm text-[#a0a0b0] cursor-pointer select-none" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={item.days.includes(d)}
              onChange={e => onChange({ ...item, days: e.target.checked ? [...item.days, d] : item.days.filter(x => x !== d) })}
              className="accent-green-500"
            />
            {d}
          </label>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Start Time</span>
          <input type="time" className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm" value={item.time} onChange={e => onChange({ ...item, time: e.target.value })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Duration (h)</span>
          <input type="number" min={0} max={12} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.durationH} onChange={e => onChange({ ...item, durationH: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Duration (m)</span>
          <input type="number" min={0} max={59} step={5} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.durationM} onChange={e => onChange({ ...item, durationM: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Min Staff</span>
          <input type="number" min={0} max={20} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.minStaff} onChange={e => onChange({ ...item, minStaff: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Role (opt)</span>
          <select className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm" value={item.role} onChange={e => onChange({ ...item, role: e.target.value })} style={{ minHeight: 44 }}>
            <option value="">Any</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="text-xs px-3 py-2 rounded bg-[#2a2a32] text-[#a0a0b0] hover:bg-[#3a3a4a] transition-colors" style={{ minHeight: 44 }}>💾 Save as Template</button>
        <button onClick={onDelete} className="text-xs px-3 py-2 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors ml-auto" style={{ minHeight: 44 }}>🗑 Delete</button>
      </div>
    </div>
  );
}

function OneoffForm({ item, onChange, onDelete, onSave }) {
  return (
    <div className="rounded-xl p-4 border border-[#2a2a32] bg-[#1a1a1f] flex flex-col gap-3">
      <input
        className="bg-[#0f0f11] border border-[#2a2a32] rounded px-3 py-2 text-white text-sm w-full"
        placeholder="Task name"
        value={item.name}
        onChange={e => onChange({ ...item, name: e.target.value })}
      />
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Date</span>
          <input type="date" className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm" value={item.date} onChange={e => onChange({ ...item, date: e.target.value })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Start Time</span>
          <input type="time" className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm" value={item.time} onChange={e => onChange({ ...item, time: e.target.value })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Duration (h)</span>
          <input type="number" min={0} max={12} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.durationH} onChange={e => onChange({ ...item, durationH: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Duration (m)</span>
          <input type="number" min={0} max={59} step={5} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.durationM} onChange={e => onChange({ ...item, durationM: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Min Staff</span>
          <input type="number" min={0} max={20} className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm w-16" value={item.minStaff} onChange={e => onChange({ ...item, minStaff: Number(e.target.value) })} style={{ minHeight: 44 }} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a0a0b0]">
          <span>Role (opt)</span>
          <select className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-white text-sm" value={item.role} onChange={e => onChange({ ...item, role: e.target.value })} style={{ minHeight: 44 }}>
            <option value="">Any</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="text-xs px-3 py-2 rounded bg-[#2a2a32] text-[#a0a0b0] hover:bg-[#3a3a4a] transition-colors" style={{ minHeight: 44 }}>💾 Save as Template</button>
        <button onClick={onDelete} className="text-xs px-3 py-2 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors ml-auto" style={{ minHeight: 44 }}>🗑 Delete</button>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useLocalStorage('hft_tasks', DEFAULT_TASKS);

  // Normalize legacy array format
  const normalizedTasks = Array.isArray(tasks) ? DEFAULT_TASKS : tasks;

  function togglePrebuilt(key) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, prebuilt: { ...p.prebuilt, [key]: { ...p.prebuilt[key], enabled: !p.prebuilt[key].enabled } } };
    });
  }

  function savePrebuiltTemplate(key) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      const tpl = { ...p.prebuilt[key], id: crypto.randomUUID(), sourceType: 'prebuilt' };
      return { ...p, templates: [...(p.templates || []), tpl] };
    });
  }

  function addRecurring() {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, recurring: [...(p.recurring || []), newRecurring()] };
    });
  }

  function updateRecurring(id, updated) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, recurring: p.recurring.map(r => r.id === id ? updated : r) };
    });
  }

  function deleteRecurring(id) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, recurring: p.recurring.filter(r => r.id !== id) };
    });
  }

  function saveRecurringTemplate(item) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, templates: [...(p.templates || []), { ...item, id: crypto.randomUUID(), sourceType: 'recurring' }] };
    });
  }

  function addOneoff() {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, oneoff: [...(p.oneoff || []), newOneoff()] };
    });
  }

  function updateOneoff(id, updated) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, oneoff: p.oneoff.map(o => o.id === id ? updated : o) };
    });
  }

  function deleteOneoff(id) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, oneoff: p.oneoff.filter(o => o.id !== id) };
    });
  }

  function saveOneoffTemplate(item) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, templates: [...(p.templates || []), { ...item, id: crypto.randomUUID(), sourceType: 'oneoff' }] };
    });
  }

  function deleteTemplate(id) {
    setTasks(prev => {
      const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
      return { ...p, templates: p.templates.filter(t => t.id !== id) };
    });
  }

  function useTemplate(tpl) {
    if (tpl.sourceType === 'recurring' || tpl.days) {
      setTasks(prev => {
        const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
        return { ...p, recurring: [...(p.recurring || []), { ...tpl, id: crypto.randomUUID() }] };
      });
    } else {
      setTasks(prev => {
        const p = Array.isArray(prev) ? DEFAULT_TASKS : prev;
        return { ...p, oneoff: [...(p.oneoff || []), { ...tpl, id: crypto.randomUUID(), date: '' }] };
      });
    }
  }

  const t = normalizedTasks;

  return (
    <div className="p-4 md:p-6 space-y-8" style={{ background: '#0f0f11', minHeight: '100%' }}>
      <h2 className="text-xl font-bold text-white">Tasks</h2>

      {/* Pre-built Tasks */}
      <section>
        <h3 className="text-sm font-semibold text-[#a0a0b0] uppercase tracking-wider mb-3">Pre-built Tasks</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(t.prebuilt).map(([key, task]) => (
            <TaskCard
              key={key}
              label={key}
              task={task}
              onToggle={() => togglePrebuilt(key)}
              onSaveTemplate={() => savePrebuiltTemplate(key)}
            />
          ))}
        </div>
      </section>

      {/* Recurring Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#a0a0b0] uppercase tracking-wider">Recurring Tasks</h3>
          <button onClick={addRecurring} className="px-3 py-2 rounded bg-green-700 text-white text-sm hover:bg-green-600 transition-colors" style={{ minHeight: 44 }}>+ Add Recurring</button>
        </div>
        <div className="flex flex-col gap-3">
          {(t.recurring || []).length === 0 && <p className="text-[#5050606] text-sm text-[#606070]">No recurring tasks yet.</p>}
          {(t.recurring || []).map(item => (
            <RecurringForm
              key={item.id}
              item={item}
              onChange={updated => updateRecurring(item.id, updated)}
              onDelete={() => deleteRecurring(item.id)}
              onSave={() => saveRecurringTemplate(item)}
            />
          ))}
        </div>
      </section>

      {/* One-off Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#a0a0b0] uppercase tracking-wider">One-off Tasks</h3>
          <button onClick={addOneoff} className="px-3 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-600 transition-colors" style={{ minHeight: 44 }}>+ Add One-off</button>
        </div>
        <div className="flex flex-col gap-3">
          {(t.oneoff || []).length === 0 && <p className="text-sm text-[#606070]">No one-off tasks yet.</p>}
          {(t.oneoff || []).map(item => (
            <OneoffForm
              key={item.id}
              item={item}
              onChange={updated => updateOneoff(item.id, updated)}
              onDelete={() => deleteOneoff(item.id)}
              onSave={() => saveOneoffTemplate(item)}
            />
          ))}
        </div>
      </section>

      {/* Task Library / Templates */}
      <section>
        <h3 className="text-sm font-semibold text-[#a0a0b0] uppercase tracking-wider mb-3">Task Library</h3>
        {(t.templates || []).length === 0 && <p className="text-sm text-[#606070]">No saved templates yet. Save a task as a template to reuse it.</p>}
        <div className="flex flex-col gap-2">
          {(t.templates || []).map(tpl => (
            <div key={tpl.id} className="flex items-center justify-between rounded-lg px-4 py-3 bg-[#1a1a1f] border border-[#2a2a32]">
              <div>
                <span className="text-white font-medium">{tpl.name || '(unnamed)'}</span>
                <span className="ml-2 text-xs text-[#606070]">{tpl.sourceType === 'recurring' || tpl.days ? 'Recurring' : 'One-off'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => useTemplate(tpl)} className="text-xs px-3 py-2 rounded bg-[#2a2a32] text-[#a0a0b0] hover:bg-[#3a3a4a] transition-colors" style={{ minHeight: 44 }}>Use</button>
                <button onClick={() => deleteTemplate(tpl.id)} className="text-xs px-3 py-2 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors" style={{ minHeight: 44 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
