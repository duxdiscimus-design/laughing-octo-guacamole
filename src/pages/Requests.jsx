import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle, XCircle, RotateCcw, Filter, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { format } from 'date-fns';

const STATUS_STYLES = {
  Pending:  { bg: '#78350f', text: '#fde68a', label: 'Pending' },
  Approved: { bg: '#14532d', text: '#86efac', label: 'Approved' },
  Denied:   { bg: '#7f1d1d', text: '#fca5a5', label: 'Denied' },
  Revoked:  { bg: '#1f2937', text: '#9ca3af', label: 'Revoked' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}>{s.label}</span>
  );
}

function fmtDate(d) {
  if (!d) return '';
  try { return format(new Date(d + 'T00:00:00'), 'MMM d, yyyy'); } catch { return d; }
}

export default function Requests() {
  const { employees, requests, setRequests, schedule } = useAppState();
  const [availability, setAvailability] = useLocalStorage('hft_availability', {});
  const [toast, setToast] = useState(null);

  // ── Add form state ──────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    type: 'TimeOff',
    subtype: 'dateRange',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterEmp, setFilterEmp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Check for schedule conflicts in a date range ────────────────────────────
  const hasScheduleConflict = (employeeId, startDate, endDate) => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T00:00:00');
    // Walk all weeks in scheduleData
    for (const [weekIdx, weekData] of Object.entries(schedule || {})) {
      const empWeek = weekData[employeeId];
      if (!empWeek) continue;
      for (const [dayIdx, dayData] of Object.entries(empWeek)) {
        if (!dayData || dayData.isOff) continue;
        // We don't have exact dates per day in schedule — approximate by checking
        // if the employee has any non-off days at all (conservative)
        if (dayData.blocks && dayData.blocks.length > 0) return true;
      }
    }
    return false;
  };

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = (req) => {
    const conflict = hasScheduleConflict(req.employeeId, req.startDate, req.endDate || req.startDate);
    // Update availability
    setAvailability(prev => {
      const empAvail = prev[req.employeeId] || { recurring: {}, dateBlocks: [] };
      return {
        ...prev,
        [req.employeeId]: {
          ...empAvail,
          dateBlocks: [
            ...(empAvail.dateBlocks || []),
            {
              id: req.id,
              start: req.startDate,
              end: req.endDate || req.startDate,
              label: 'Approved Time Off',
              isApproved: true,
            },
          ],
        },
      };
    });
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Approved' } : r));
    if (conflict) {
      showToast(`⚠️ ${req.employeeName} may have shifts during this period — check schedule for violations.`, 'warn');
    } else {
      showToast(`✓ Approved time off for ${req.employeeName}`);
    }
  };

  // ── Deny ────────────────────────────────────────────────────────────────────
  const handleDeny = (req) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Denied' } : r));
    showToast(`Denied request for ${req.employeeName}`);
  };

  // ── Revoke ──────────────────────────────────────────────────────────────────
  const handleRevoke = (req) => {
    // Remove availability block
    setAvailability(prev => {
      const empAvail = prev[req.employeeId] || { recurring: {}, dateBlocks: [] };
      return {
        ...prev,
        [req.employeeId]: {
          ...empAvail,
          dateBlocks: (empAvail.dateBlocks || []).filter(b => b.id !== req.id),
        },
      };
    });
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Revoked' } : r));
    showToast(`Revoked — availability block removed for ${req.employeeName}`);
  };

  // ── Submit new request ───────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.startDate) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    const newReq = {
      id: crypto.randomUUID(),
      employeeId: form.employeeId,
      employeeName: emp?.name || '',
      type: form.type,
      subtype: form.subtype,
      startDate: form.startDate,
      endDate: form.subtype === 'dateRange' ? (form.endDate || form.startDate) : form.startDate,
      startTime: form.startTime,
      endTime: form.endTime,
      notes: form.notes,
      status: 'Pending',
      createdAt: Date.now(),
    };
    setRequests(prev => [newReq, ...prev]);
    setForm(f => ({ ...f, startDate: '', endDate: '', startTime: '', endTime: '', notes: '' }));
    setShowForm(false);
    showToast(`Request submitted for ${emp?.name}`);
  };

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return (requests || []).filter(r => {
      if (filterEmp && r.employeeId !== filterEmp) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });
  }, [requests, filterEmp, filterType, filterStatus]);

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: '#e8e8ee' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          style={{
            background: toast.type === 'error' ? '#7f1d1d' : toast.type === 'warn' ? '#78350f' : '#14532d',
            color: '#fff', border: `1px solid ${toast.type === 'error' ? '#ef4444' : toast.type === 'warn' ? '#f59e0b' : '#22c55e'}`,
          }}>
          {toast.type === 'warn' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f5c842' }}>Requests</h2>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {(requests || []).filter(r => r.status === 'Pending').length} pending
            {' · '}{(requests || []).length} total
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
          style={{ background: '#f5c842', color: '#0f0f11', minHeight: 44 }}>
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Add Request'}
        </button>
      </div>

      {/* Add Request Form */}
      {showForm && (
        <form onSubmit={handleSubmit}
          className="p-5 rounded-xl space-y-4"
          style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
          <h3 className="font-semibold text-lg">New Request</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee */}
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Employee *</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>
            {/* Type */}
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }}>
                <option value="TimeOff">Time Off</option>
                <option value="Unavailability">Unavailability</option>
              </select>
            </div>
            {/* Subtype */}
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Duration</label>
              <select value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }}>
                <option value="fullDay">Full Day</option>
                <option value="dateRange">Date Range</option>
                <option value="timeWindow">Time Window (same day)</option>
              </select>
            </div>
            {/* Start Date */}
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
            </div>
            {/* End Date (dateRange) */}
            {form.subtype === 'dateRange' && (
              <div>
                <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  min={form.startDate}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
              </div>
            )}
            {/* Time window */}
            {form.subtype === 'timeWindow' && (
              <>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
                </div>
              </>
            )}
            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit"
              className="px-5 py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: '#f5c842', color: '#0f0f11', minHeight: 44 }}>
              Submit Request
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-lg text-sm"
              style={{ background: '#2a2a32', color: '#e8e8ee', minHeight: 44 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 text-sm" style={{ color: '#6b7280' }}>
          <Filter size={14} /> Filter:
        </div>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#1a1a1f', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 36 }}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#1a1a1f', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 36 }}>
          <option value="">All Types</option>
          <option value="TimeOff">Time Off</option>
          <option value="Unavailability">Unavailability</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#1a1a1f', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 36 }}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
          <option value="Revoked">Revoked</option>
        </select>
        {(filterEmp || filterType || filterStatus) && (
          <button onClick={() => { setFilterEmp(''); setFilterType(''); setFilterStatus(''); }}
            className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#2a2a32', color: '#9ca3af' }}>
            Clear
          </button>
        )}
      </div>

      {/* Request Queue */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center" style={{ color: '#6b7280' }}>
          {(requests || []).length === 0 ? 'No requests yet. Add one above.' : 'No requests match the current filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="p-4 rounded-xl"
              style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
              <div className="flex flex-wrap items-start gap-3 justify-between">
                {/* Left info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{req.employeeName}</span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: '#2a2a32', color: '#9ca3af' }}>
                      {req.type === 'TimeOff' ? 'Time Off' : 'Unavailability'}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="text-sm" style={{ color: '#6b7280' }}>
                    {req.subtype === 'timeWindow'
                      ? `${fmtDate(req.startDate)} · ${req.startTime}–${req.endTime}`
                      : req.startDate === req.endDate || !req.endDate
                        ? fmtDate(req.startDate)
                        : `${fmtDate(req.startDate)} – ${fmtDate(req.endDate)}`}
                  </div>
                  {req.notes && (
                    <div className="text-xs italic" style={{ color: '#6b7280' }}>{req.notes}</div>
                  )}
                  <div className="text-xs" style={{ color: '#4b5563' }}>
                    Submitted {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy') : ''}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {req.status === 'Pending' && (
                    <>
                      <button onClick={() => handleApprove(req)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                        style={{ background: '#14532d', color: '#86efac', minHeight: 36 }}>
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button onClick={() => handleDeny(req)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                        style={{ background: '#7f1d1d', color: '#fca5a5', minHeight: 36 }}>
                        <XCircle size={13} /> Deny
                      </button>
                    </>
                  )}
                  {req.status === 'Approved' && (
                    <button onClick={() => handleRevoke(req)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: '#1f2937', color: '#9ca3af', minHeight: 36 }}>
                      <RotateCcw size={13} /> Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

