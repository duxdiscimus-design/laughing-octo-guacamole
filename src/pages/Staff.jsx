import React, { useState, useCallback } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ROLES, DAYS_OF_WEEK, LS_KEYS } from '../constants';

// ─── Role badge styles ────────────────────────────────────────────────────────
const ROLE_STYLES = {
  SM:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  AM:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  SUP: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  FTC: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PT:  'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

// ─── Hour gauge ───────────────────────────────────────────────────────────────
function HourGauge({ scheduled, target }) {
  const pct = target > 0 ? Math.min((scheduled / target) * 100, 120) : 0;
  const diff = scheduled - target;
  const color = diff > 0 ? 'bg-red-500' : Math.abs(diff) > 2 ? 'bg-orange-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex-1 bg-[#2a2a32] rounded-full h-2 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono ${diff > 0 ? 'text-red-400' : diff < -2 ? 'text-orange-400' : 'text-green-400'}`}>
        {scheduled.toFixed(1)}/{target}h
      </span>
    </div>
  );
}

// ─── Empty form template ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  role: 'FTC',
  targetHours: 36,
  shiftLength: 8,
  lunchMinutes: 30,
  lunchPaid: true,
  hourlyRate: 15,
  planningHours: 0,
  notes: '',
};

// ─── Add-employee modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({ ...form, id: crypto.randomUUID() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a32]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Add New Employee</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <EmployeeFormFields form={form} set={set} />
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 min-h-[44px] bg-[var(--color-accent)] text-black font-semibold rounded-lg hover:opacity-90">Add Employee</button>
            <button type="button" onClick={onClose} className="flex-1 min-h-[44px] bg-[#2a2a32] text-[var(--color-text-primary)] rounded-lg hover:bg-[#33333c]">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────
function EmployeeFormFields({ form, set }) {
  const showPlanning = ['SM', 'AM', 'SUP'].includes(form.role);
  return (
    <>
      <label className="block">
        <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Name</span>
        <input
          className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Employee name"
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Role</span>
          <select
            className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
            value={form.role}
            onChange={e => set('role', e.target.value)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Target Hrs/Week</span>
          <input type="number" min="0" max="80"
            className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
            value={form.targetHours}
            onChange={e => set('targetHours', Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Shift Length (hrs)</span>
          <input type="number" min="1" max="16" step="0.5"
            className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
            value={form.shiftLength}
            onChange={e => set('shiftLength', Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Lunch (min)</span>
          <input type="number" min="0" max="60" step="5"
            className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
            value={form.lunchMinutes}
            onChange={e => set('lunchMinutes', Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Hourly Rate ($)</span>
          <input type="number" min="0" step="0.25"
            className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
            value={form.hourlyRate}
            onChange={e => set('hourlyRate', Number(e.target.value))}
          />
        </label>
        {showPlanning && (
          <label className="block">
            <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Planning Hrs/Week</span>
            <input type="number" min="0" max="40"
              className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] min-h-[44px]"
              value={form.planningHours}
              onChange={e => set('planningHours', Number(e.target.value))}
            />
          </label>
        )}
      </div>
      <label className="block">
        <span className="text-xs text-[var(--color-text-muted)] mb-1 block">Notes</span>
        <textarea
          className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-[var(--color-text-primary)] resize-none"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional notes…"
        />
      </label>
    </>
  );
}

// ─── Availability section ─────────────────────────────────────────────────────
function AvailabilitySection({ empId, availability, setAvailability, lockedBlocks }) {
  const empAvail = availability[empId] || { recurring: {}, dateBlocks: [] };
  const recurring = empAvail.recurring || {};
  const dateBlocks = empAvail.dateBlocks || [];

  const [newBlock, setNewBlock] = useState({ label: '', start: '', end: '' });
  const [blockWeek, setBlockWeek] = useState(false);

  const updateRecurring = (day, value) => {
    setAvailability(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { recurring: {}, dateBlocks: [] }),
        recurring: { ...(prev[empId]?.recurring || {}), [day]: value },
      },
    }));
  };

  const addDateBlock = () => {
    if (!newBlock.label.trim() || !newBlock.start || !newBlock.end) return;
    setAvailability(prev => {
      const cur = prev[empId] || { recurring: {}, dateBlocks: [] };
      return {
        ...prev,
        [empId]: {
          ...cur,
          dateBlocks: [...(cur.dateBlocks || []), { ...newBlock, id: crypto.randomUUID() }],
        },
      };
    });
    setNewBlock({ label: '', start: '', end: '' });
  };

  const removeDateBlock = (blockId) => {
    setAvailability(prev => {
      const cur = prev[empId] || { recurring: {}, dateBlocks: [] };
      return {
        ...prev,
        [empId]: { ...cur, dateBlocks: (cur.dateBlocks || []).filter(b => b.id !== blockId) },
      };
    });
  };

  const toggleBlockWeek = () => {
    const next = !blockWeek;
    setBlockWeek(next);
    setAvailability(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || { recurring: {}, dateBlocks: [] }), blockEntireWeek: next },
    }));
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Recurring availability */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Recurring Availability</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => {
            const isAvail = recurring[day] !== false;
            return (
              <button
                key={day}
                type="button"
                onClick={() => updateRecurring(day, !isAvail)}
                className={`min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors ${
                  isAvail
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-[#2a2a32] text-[var(--color-text-muted)] border border-[#33333c]'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Block entire week toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleBlockWeek}
          className={`relative w-11 h-6 rounded-full transition-colors ${blockWeek ? 'bg-red-500' : 'bg-[#2a2a32]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${blockWeek ? 'translate-x-5' : ''}`} />
        </button>
        <span className="text-sm text-[var(--color-text-muted)]">Block entire week (rotation week off)</span>
      </div>

      {/* Date blocks */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Date Blocks &amp; Time Off</p>
        {/* Locked (approved) blocks */}
        {(lockedBlocks || []).map((b, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 mb-2">
            <span className="text-yellow-400 text-sm">🔒</span>
            <span className="text-sm text-[var(--color-text-primary)] flex-1">{b.label}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{b.start} → {b.end}</span>
          </div>
        ))}
        {/* User-added blocks */}
        {dateBlocks.map(b => (
          <div key={b.id} className="flex items-center gap-2 bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 mb-2">
            <span className="text-sm text-[var(--color-text-primary)] flex-1">{b.label}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{b.start} → {b.end}</span>
            <button
              type="button"
              onClick={() => removeDateBlock(b.id)}
              className="text-red-400 hover:text-red-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ))}
        {/* Add date block form */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end mt-2">
          <input
            className="bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] min-h-[44px]"
            placeholder="Label (e.g. Vacation)"
            value={newBlock.label}
            onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))}
          />
          <input type="date"
            className="bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] min-h-[44px]"
            value={newBlock.start}
            onChange={e => setNewBlock(p => ({ ...p, start: e.target.value }))}
          />
          <input type="date"
            className="bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] min-h-[44px]"
            value={newBlock.end}
            onChange={e => setNewBlock(p => ({ ...p, end: e.target.value }))}
          />
          <button
            type="button"
            onClick={addDateBlock}
            className="bg-[var(--color-accent)] text-black font-semibold rounded-lg px-3 min-h-[44px] hover:opacity-90 text-sm whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────
function EmployeeCard({ emp, scheduledHours, availability, setAvailability, lockedBlocks, onSave, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ ...emp });
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    setDirty(false);
  };

  const handleCancel = () => {
    setForm({ ...emp });
    setDirty(false);
    setExpanded(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove "${emp.name}" from the schedule? This cannot be undone.`)) {
      onDelete(emp.id);
    }
  };

  const showPlanning = ['SM', 'AM', 'SUP'].includes(form.role);

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[var(--color-text-primary)] truncate">{emp.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_STYLES[emp.role] || ROLE_STYLES.PT}`}>
              {emp.role}
            </span>
          </div>
          <HourGauge scheduled={scheduledHours} target={emp.targetHours} />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded edit section */}
      {expanded && (
        <div className="border-t border-[#2a2a32] px-4 py-4 space-y-3">
          {/* Edit fields */}
          <EmployeeFormFields form={form} set={set} />

          {/* Availability */}
          <AvailabilitySection
            empId={emp.id}
            availability={availability}
            setAvailability={setAvailability}
            lockedBlocks={lockedBlocks}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {dirty && (
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 min-h-[44px] bg-[var(--color-accent)] text-black font-semibold rounded-lg hover:opacity-90"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 min-h-[44px] bg-[#2a2a32] text-[var(--color-text-primary)] rounded-lg hover:bg-[#33333c]"
            >
              {dirty ? 'Cancel' : 'Collapse'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="min-h-[44px] min-w-[44px] px-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Staff page ──────────────────────────────────────────────────────────
export default function Staff() {
  const { employees, setEmployees, schedule, requests } = useAppState();
  const [availability, setAvailability] = useLocalStorage('hft_availability', {});
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstLaunchDismissed, setFirstLaunchDismissed] = useState(
    () => localStorage.getItem(LS_KEYS.FIRST_LAUNCH) !== null
  );

  // Compute scheduled hours per employee from the schedule
  const scheduledHoursMap = useCallback(() => {
    const map = {};
    if (!schedule || typeof schedule !== 'object') return map;
    Object.values(schedule).forEach(dayShifts => {
      if (!dayShifts || typeof dayShifts !== 'object') return;
      Object.entries(dayShifts).forEach(([empId, tasks]) => {
        if (!Array.isArray(tasks)) return;
        const hrs = tasks.reduce((acc, t) => {
          if (t.type === 'Lunch' || t.type === 'ApprovedOff') return acc;
          const start = t.startMin ?? 0;
          const end = t.endMin ?? 0;
          return acc + Math.max(0, (end - start) / 60);
        }, 0);
        map[empId] = (map[empId] || 0) + hrs;
      });
    });
    return map;
  }, [schedule])();

  // Build locked (approved time-off) blocks per employee from requests
  const lockedBlocksMap = {};
  if (Array.isArray(requests)) {
    requests
      .filter(r => r.status === 'approved' && r.type === 'timeoff')
      .forEach(r => {
        if (!lockedBlocksMap[r.empId]) lockedBlocksMap[r.empId] = [];
        lockedBlocksMap[r.empId].push({ label: r.label || 'Approved Time Off', start: r.start, end: r.end });
      });
  }

  const dismissBanner = () => {
    localStorage.setItem(LS_KEYS.FIRST_LAUNCH, 'done');
    setFirstLaunchDismissed(true);
  };

  const addEmployee = (emp) => {
    setEmployees(prev => [...prev, emp]);
  };

  const saveEmployee = (updated) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const deleteEmployee = (id) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Staff</h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="min-h-[44px] px-4 bg-[var(--color-accent)] text-black font-semibold rounded-lg hover:opacity-90 text-sm"
        >
          + Add Employee
        </button>
      </div>

      {/* First-launch banner */}
      {!firstLaunchDismissed && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <span className="text-yellow-400 text-lg mt-0.5">👋</span>
          <p className="flex-1 text-sm text-yellow-300">
            Welcome! Please update employee names before generating your first schedule.
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            className="text-yellow-400 hover:text-yellow-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-3">
        {employees.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)] py-10">No employees yet. Add one above.</p>
        )}
        {employees.map(emp => (
          <EmployeeCard
            key={emp.id}
            emp={emp}
            scheduledHours={scheduledHoursMap[emp.id] || 0}
            availability={availability}
            setAvailability={setAvailability}
            lockedBlocks={lockedBlocksMap[emp.id]}
            onSave={saveEmployee}
            onDelete={deleteEmployee}
          />
        ))}
      </div>

      {/* Add employee modal */}
      {showAddModal && (
        <AddEmployeeModal
          onAdd={addEmployee}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
