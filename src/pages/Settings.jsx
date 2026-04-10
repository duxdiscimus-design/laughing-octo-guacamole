import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { LS_KEYS } from '../constants';

const DEFAULTS = {
  storeName: 'Harbor Freight Tools',
  storeHours: { weekday: { open: '07:30', close: '20:30' }, sunday: { open: '08:30', close: '18:30' } },
  defaultShiftLengths: { SM: 9, AM: 8, SUP: 8, FTC: 8, PT: 5 },
  theme: 'dark',
  exportFormat: 'pdf',
};

export default function Settings() {
  const { settings, setSettings, setSchedule } = useAppState();
  const { resetRotation } = useRotation();

  const merged = { ...DEFAULTS, ...settings, storeHours: { ...DEFAULTS.storeHours, ...settings?.storeHours }, defaultShiftLengths: { ...DEFAULTS.defaultShiftLengths, ...settings?.defaultShiftLengths } };

  const [form, setForm] = useState(merged);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (path, val) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) { obj[keys[i]] = { ...obj[keys[i]] }; obj = obj[keys[i]]; }
      obj[keys[keys.length - 1]] = val;
      return next;
    });
  };

  const handleSave = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleStartNewRotation = () => {
    setSchedule({});
    resetRotation();
    setShowRotationModal(false);
  };

  const handleResetAll = () => {
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('hft_availability');
    localStorage.removeItem('hft_first_launch');
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-6 space-y-6" style={{ color: '#e8e8ee' }}>
      <h2 className="text-2xl font-bold" style={{ color: '#f5c842' }}>Settings</h2>

      {/* Store Info */}
      <section className="p-5 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <h3 className="font-semibold text-lg">Store Information</h3>
        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Store Name</label>
          <input value={form.storeName} onChange={e => update('storeName', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
        </div>
      </section>

      {/* Store Hours */}
      <section className="p-5 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <h3 className="font-semibold text-lg">Store Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Weekday Open</label>
            <input type="time" value={form.storeHours.weekday.open} onChange={e => update('storeHours.weekday.open', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Weekday Close</label>
            <input type="time" value={form.storeHours.weekday.close} onChange={e => update('storeHours.weekday.close', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Sunday Open</label>
            <input type="time" value={form.storeHours.sunday.open} onChange={e => update('storeHours.sunday.open', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Sunday Close</label>
            <input type="time" value={form.storeHours.sunday.close} onChange={e => update('storeHours.sunday.close', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
          </div>
        </div>
      </section>

      {/* Default Shift Lengths */}
      <section className="p-5 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <h3 className="font-semibold text-lg">Default Shift Lengths (hours)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {['SM','AM','SUP','FTC','PT'].map(role => (
            <div key={role}>
              <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>{role}</label>
              <input type="number" min={1} max={12} value={form.defaultShiftLengths[role]}
                onChange={e => update(`defaultShiftLengths.${role}`, Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm text-center" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }} />
            </div>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section className="p-5 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <h3 className="font-semibold text-lg">Preferences</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Default Export Format</label>
            <select value={form.exportFormat} onChange={e => update('exportFormat', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="png">PNG</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Theme</label>
            <select value={form.theme} onChange={e => update('theme', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee', minHeight: 44 }}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </section>

      <button onClick={handleSave}
        className="px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-80"
        style={{ background: '#f5c842', color: '#0f0f11', minHeight: 44 }}>
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>

      {/* Start New Rotation */}
      <section className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <h3 className="font-semibold text-lg flex items-center gap-2"><RotateCcw size={18} style={{ color: '#f97316' }} /> Rotation Management</h3>
        <p className="text-sm" style={{ color: '#6b7280' }}>Start a new 4-week rotation. This clears all schedule data but preserves employees, rules, tasks, requests, and settings.</p>
        <button onClick={() => setShowRotationModal(true)}
          className="px-5 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
          style={{ background: '#f97316', color: '#fff', minHeight: 44 }}>
          Start New Rotation
        </button>
      </section>

      {/* Danger Zone */}
      <section className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '2px solid #ef4444' }}>
        <h3 className="font-semibold text-lg flex items-center gap-2 text-red-400"><Trash2 size={18} /> Danger Zone</h3>
        <p className="text-sm" style={{ color: '#6b7280' }}>Permanently delete all app data. This cannot be undone. Type <strong className="text-red-400">RESET</strong> to confirm.</p>
        <div className="flex gap-3 items-center flex-wrap">
          <input value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder='Type "RESET" to confirm'
            className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: '#0f0f11', border: '1px solid #ef4444', color: '#e8e8ee', minHeight: 44 }} />
          <button onClick={() => setShowResetModal(true)} disabled={resetInput !== 'RESET'}
            className="px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-30 transition-opacity hover:opacity-80"
            style={{ background: '#ef4444', color: '#fff', minHeight: 44 }}>
            Reset All Data
          </button>
        </div>
      </section>

      {/* Rotation confirmation modal */}
      {showRotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
            <h3 className="text-lg font-bold flex items-center gap-2"><AlertTriangle size={20} style={{ color: '#f97316' }} /> Start New Rotation?</h3>
            <p className="text-sm" style={{ color: '#6b7280' }}>This will clear all 4 weeks of schedule data. Employee profiles, rules, tasks, requests, and settings will be preserved.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRotationModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2a32', color: '#e8e8ee', minHeight: 44 }}>Cancel</button>
              <button onClick={handleStartNewRotation} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#f97316', color: '#fff', minHeight: 44 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset all confirmation modal */}
      {showResetModal && resetInput === 'RESET' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-xl space-y-4" style={{ background: '#1a1a1f', border: '2px solid #ef4444' }}>
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2"><Trash2 size={20} /> Delete All Data?</h3>
            <p className="text-sm" style={{ color: '#6b7280' }}>This will permanently delete all data including employees, schedule, rules, and settings. The app will reload.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowResetModal(false); setResetInput(''); }} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2a32', color: '#e8e8ee', minHeight: 44 }}>Cancel</button>
              <button onClick={handleResetAll} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#ef4444', color: '#fff', minHeight: 44 }}>Yes, Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
