import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DAYS_OF_WEEK } from '../constants';
import { Clipboard, FileText, FileDown, Printer, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function Export() {
  const { employees, settings } = useAppState();
  const { scheduleData } = useSchedule();
  const { currentWeek, getWeekStartDate } = useRotation();
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const weekStart = getWeekStartDate ? getWeekStartDate(currentWeek) : new Date();
  const storeName = settings?.storeName || 'Harbor Freight Tools';

  const getWeekDateRange = () => {
    if (!weekStart) return 'Current Week';
    const end = addDays(new Date(weekStart), 6);
    return `${format(new Date(weekStart), 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  const buildCSV = () => {
    const week = scheduleData[currentWeek] || {};
    const rows = ['Employee,Role,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total Hours,Estimated Cost'];
    employees.forEach(emp => {
      const empDays = week[emp.id] || {};
      let totalHours = 0;
      const dayCols = DAYS_OF_WEEK.map((_, di) => {
        const day = empDays[di];
        if (!day || day.isOff) return 'OFF';
        if (day.isApprovedOff) return 'OFF (Approved)';
        const hrs = (day.blocks || []).reduce((s, b) => s + (b.durationHours || 0), 0);
        totalHours += hrs;
        const primary = day.blocks?.[0]?.type || '';
        return `${day.startTime || ''}-${day.endTime || ''} (${primary})`;
      });
      const cost = (totalHours * (emp.hourlyRate || 0)).toFixed(2);
      rows.push([emp.name, emp.role, ...dayCols, totalHours.toFixed(1), `$${cost}`].map(v => `"${v}"`).join(','));
    });
    return rows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportScheduleCSV = () => {
    downloadCSV(buildCSV(), `schedule-week${currentWeek + 1}.csv`);
    showToast('Schedule exported as CSV');
  };

  const handleExportLaborCSV = () => {
    const week = scheduleData[currentWeek] || {};
    const rows = ['Employee,Role,Scheduled Hours,Target Hours,Hourly Rate,Estimated Cost,Over/Under'];
    employees.forEach(emp => {
      const empDays = week[emp.id] || {};
      const hrs = Object.values(empDays).reduce((s, day) => {
        if (day.isOff) return s;
        return s + (day.blocks || []).reduce((bs, b) => bs + (b.durationHours || 0), 0);
      }, 0);
      const cost = (hrs * (emp.hourlyRate || 0)).toFixed(2);
      const diff = (hrs - emp.targetHours).toFixed(1);
      rows.push([emp.name, emp.role, hrs.toFixed(1), emp.targetHours, `$${emp.hourlyRate}`, `$${cost}`, diff > 0 ? `+${diff}` : diff].map(v => `"${v}"`).join(','));
    });
    downloadCSV(rows.join('\n'), `labor-report-week${currentWeek + 1}.csv`);
    showToast('Labor report exported as CSV');
  };

  const handleCopyClipboard = async () => {
    const week = scheduleData[currentWeek] || {};
    const lines = [`${storeName} — ${getWeekDateRange()}`, ''];
    employees.forEach(emp => {
      const empDays = week[emp.id] || {};
      const days = DAYS_OF_WEEK.map((d, di) => {
        const day = empDays[di];
        if (!day || day.isOff) return `${d}: OFF`;
        const hrs = (day.blocks || []).reduce((s, b) => s + (b.durationHours || 0), 0);
        return `${d}: ${day.startTime || '?'}–${day.endTime || '?'} (${hrs}h)`;
      });
      lines.push(`${emp.name} [${emp.role}]`);
      lines.push('  ' + days.join(' | '));
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('Schedule copied to clipboard');
    } catch {
      showToast('Copy failed — please use CSV export');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6" style={{ color: '#e8e8ee' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          style={{ background: '#16a34a', color: '#fff', border: '1px solid #15803d' }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#f5c842' }}>Export</h2>
        <p style={{ color: '#6b7280' }}>{storeName} — {getWeekDateRange()}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
          <div className="flex items-center gap-2 font-semibold">
            <FileDown size={18} style={{ color: '#f5c842' }} />
            Schedule Export
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Download the current week schedule as CSV.</p>
          <button onClick={handleExportScheduleCSV}
            className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
            style={{ background: '#f5c842', color: '#0f0f11', minHeight: 44 }}>
            Download Schedule CSV
          </button>
        </div>

        <div className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
          <div className="flex items-center gap-2 font-semibold">
            <FileText size={18} style={{ color: '#f5c842' }} />
            Labor Report
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Export hours and cost per employee as CSV.</p>
          <button onClick={handleExportLaborCSV}
            className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
            style={{ background: '#3b82f6', color: '#fff', minHeight: 44 }}>
            Download Labor CSV
          </button>
        </div>

        <div className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
          <div className="flex items-center gap-2 font-semibold">
            <Clipboard size={18} style={{ color: '#f5c842' }} />
            Copy to Clipboard
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Copy a plain-text schedule summary to paste anywhere.</p>
          <button onClick={handleCopyClipboard}
            className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
            style={{ background: '#8b5cf6', color: '#fff', minHeight: 44 }}>
            Copy Schedule Text
          </button>
        </div>

        <div className="p-5 rounded-xl space-y-3" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
          <div className="flex items-center gap-2 font-semibold">
            <Printer size={18} style={{ color: '#f5c842' }} />
            Print / PDF
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Use browser print to save as PDF or send to printer.</p>
          <button onClick={handlePrint}
            className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
            style={{ background: '#22c55e', color: '#0f0f11', minHeight: 44 }}>
            Print Schedule
          </button>
        </div>
      </div>

      {/* Print layout (hidden on screen) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{storeName}</h1>
        <p>Week of {getWeekDateRange()}</p>
        <table className="w-full border-collapse mt-4 text-xs">
          <thead>
            <tr>
              <th className="border p-1 text-left">Employee</th>
              {DAYS_OF_WEEK.map(d => <th key={d} className="border p-1">{d}</th>)}
              <th className="border p-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const week = scheduleData[currentWeek] || {};
              const empDays = week[emp.id] || {};
              let total = 0;
              return (
                <tr key={emp.id}>
                  <td className="border p-1">{emp.name} ({emp.role})</td>
                  {DAYS_OF_WEEK.map((_, di) => {
                    const day = empDays[di];
                    if (!day || day.isOff) return <td key={di} className="border p-1 text-center">OFF</td>;
                    const hrs = (day.blocks || []).reduce((s, b) => s + (b.durationHours || 0), 0);
                    total += hrs;
                    return <td key={di} className="border p-1 text-center">{day.startTime}–{day.endTime}</td>;
                  })}
                  <td className="border p-1 text-center">{total}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
