import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { ROLES, DAYS_OF_WEEK } from '../constants';

const SURFACE = '#1a1a1f';
const GRID = '#2a2a32';
const ACCENT = '#f5c842';

export default function Labor() {
  const { employees, setEmployees, laborBudget, setLaborBudget } = useAppState();
  const { getEmployeeWeekHours, scheduleData } = useSchedule();
  const { currentWeek } = useRotation();

  const [weeklyBudget, setWeeklyBudget] = useState(laborBudget.weeklyBudget ?? 0);
  const [globalRate, setGlobalRate] = useState(laborBudget.globalRate ?? 0);
  const [show4Week, setShow4Week] = useState(false);

  const saveBudget = () => {
    setLaborBudget({ weeklyBudget: Number(weeklyBudget), globalRate: Number(globalRate) });
  };

  const applyGlobalRate = () => {
    if (!globalRate) return;
    setEmployees(prev => prev.map(e => ({ ...e, hourlyRate: Number(globalRate) })));
    saveBudget();
  };

  const updateRate = (id, rate) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, hourlyRate: Number(rate) } : e));
  };

  const getWeekMetrics = (weekIdx) => {
    let totalHours = 0;
    let totalCost = 0;
    let totalTarget = 0;
    const perEmp = employees.map(emp => {
      const hrs = getEmployeeWeekHours(weekIdx, emp.id);
      const cost = hrs * (emp.hourlyRate || 0);
      totalHours += hrs;
      totalCost += cost;
      totalTarget += emp.targetHours || 0;
      return { ...emp, scheduledHours: hrs, estimatedCost: cost };
    });
    const utilization = totalTarget > 0 ? (totalHours / totalTarget) * 100 : 0;
    return { totalHours, totalCost, totalTarget, utilization, perEmp };
  };

  const metrics = getWeekMetrics(currentWeek);
  const budget = Number(weeklyBudget) || 0;
  const overBudget = budget > 0 && metrics.totalCost > budget;

  // Per-role breakdown
  const roleData = ROLES.map(role => {
    const emps = employees.filter(e => e.role === role);
    const scheduled = emps.reduce((s, e) => s + getEmployeeWeekHours(currentWeek, e.id), 0);
    const target = emps.reduce((s, e) => s + (e.targetHours || 0), 0);
    return { role, scheduled, target };
  });

  // 4-week bar chart data (weekly cost)
  const weekBarData = [0, 1, 2, 3].map(w => {
    const m = getWeekMetrics(w);
    return { name: `Week ${w + 1}`, cost: parseFloat(m.totalCost.toFixed(2)), hours: parseFloat(m.totalHours.toFixed(1)) };
  });

  // Line chart: hours per employee this week
  const lineData = metrics.perEmp.map(e => ({ name: e.name.split(' ').slice(-1)[0], hours: parseFloat(e.scheduledHours.toFixed(1)) }));

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--color-text-primary)' }}>
      <h2 className="text-xl font-bold">Labor</h2>

      {/* Budget & Rate Inputs */}
      <div className="rounded-xl p-4 space-y-4" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
        <h3 className="font-semibold text-base">Budget & Rates</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[#a0a0b0]">Weekly Labor Budget ($)</span>
            <input
              type="number" min="0" value={weeklyBudget}
              onChange={e => setWeeklyBudget(e.target.value)}
              onBlur={saveBudget}
              className="bg-[#0f0f11] border border-[#2a2a32] rounded px-3 py-2 w-44 min-h-[44px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[#a0a0b0]">Global Hourly Rate ($/hr)</span>
            <div className="flex gap-2">
              <input
                type="number" min="0" value={globalRate}
                onChange={e => setGlobalRate(e.target.value)}
                className="bg-[#0f0f11] border border-[#2a2a32] rounded px-3 py-2 w-32 min-h-[44px] text-white"
              />
              <button
                onClick={applyGlobalRate}
                className="px-4 min-h-[44px] rounded font-medium text-sm"
                style={{ background: ACCENT, color: '#0f0f11' }}
              >Apply to All</button>
            </div>
          </label>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Hours', value: metrics.totalHours.toFixed(1) + ' hrs' },
          { label: 'Estimated Cost', value: '$' + metrics.totalCost.toFixed(2) },
          { label: 'Utilization', value: metrics.utilization.toFixed(1) + '%' },
          { label: budget > 0 ? (overBudget ? '⚠ Over Budget' : '✓ Under Budget') : 'Budget', value: budget > 0 ? `$${Math.abs(budget - metrics.totalCost).toFixed(2)} ${overBudget ? 'over' : 'under'}` : 'N/A' },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
            <p className="text-xs text-[#a0a0b0] mb-1">{m.label}</p>
            <p className={`text-lg font-bold ${m.label.includes('Over') ? 'text-red-400' : m.label.includes('Under') ? 'text-green-400' : ''}`}
              style={!m.label.includes('Budget') ? { color: ACCENT } : {}}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Per-Employee Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
        <h3 className="font-semibold text-base px-4 pt-4 pb-2">Per-Employee Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: GRID, color: '#a0a0b0' }}>
                {['Name', 'Role', 'Sched. Hrs', 'Target Hrs', 'Rate ($/hr)', 'Est. Cost', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.perEmp.map(emp => {
                const over = emp.scheduledHours > emp.targetHours;
                const under = emp.scheduledHours < emp.targetHours * 0.8;
                return (
                  <tr key={emp.id} style={{ borderBottom: `1px solid ${GRID}` }}>
                    <td className="px-3 py-2">{emp.name}</td>
                    <td className="px-3 py-2 text-[#a0a0b0]">{emp.role}</td>
                    <td className="px-3 py-2">{emp.scheduledHours.toFixed(1)}</td>
                    <td className="px-3 py-2 text-[#a0a0b0]">{emp.targetHours}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0" value={emp.hourlyRate || 0}
                        onChange={e => updateRate(emp.id, e.target.value)}
                        className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 w-20 text-white"
                      />
                    </td>
                    <td className="px-3 py-2">${emp.estimatedCost.toFixed(2)}</td>
                    <td className="px-3 py-2 font-medium">
                      <span className={over ? 'text-red-400' : under ? 'text-yellow-400' : 'text-green-400'}>
                        {over ? 'Over' : under ? 'Under' : 'On Target'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Role Progress */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
        <h3 className="font-semibold text-base">Per-Role Hours</h3>
        {roleData.map(r => {
          const pct = r.target > 0 ? Math.min((r.scheduled / r.target) * 100, 100) : 0;
          return (
            <div key={r.role}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{r.role}</span>
                <span className="text-[#a0a0b0]">{r.scheduled.toFixed(1)} / {r.target} hrs</span>
              </div>
              <div className="h-3 rounded-full" style={{ background: GRID }}>
                <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: ACCENT }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-Week Toggle */}
      <div>
        <button
          onClick={() => setShow4Week(v => !v)}
          className="px-4 min-h-[44px] rounded font-medium text-sm mb-3"
          style={{ background: GRID, color: '#e8e8ee' }}
        >
          {show4Week ? 'Hide' : 'Show'} 4-Week View
        </button>
        {show4Week && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {weekBarData.map((w, i) => {
              const m = getWeekMetrics(i);
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: SURFACE, border: `1px solid ${i === currentWeek ? ACCENT : GRID}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: i === currentWeek ? ACCENT : '#a0a0b0' }}>
                    {w.name}{i === currentWeek ? ' (Current)' : ''}
                  </p>
                  <p className="text-sm">Hours: <strong>{m.totalHours.toFixed(1)}</strong></p>
                  <p className="text-sm">Cost: <strong>${m.totalCost.toFixed(2)}</strong></p>
                  <p className="text-sm">Util: <strong>{m.utilization.toFixed(1)}%</strong></p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bar Chart: Weekly Cost */}
      <div className="rounded-xl p-4" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
        <h3 className="font-semibold text-base mb-3">Weekly Labor Cost (4-Week Cycle)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekBarData} style={{ background: SURFACE }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} />
            <YAxis stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} />
            <Tooltip contentStyle={{ background: '#0f0f11', border: `1px solid ${GRID}`, color: '#e8e8ee' }} />
            <Legend wrapperStyle={{ color: '#a0a0b0' }} />
            <Bar dataKey="cost" fill={ACCENT} name="Labor Cost ($)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart: Hours per Employee */}
      <div className="rounded-xl p-4" style={{ background: SURFACE, border: `1px solid ${GRID}` }}>
        <h3 className="font-semibold text-base mb-3">Hours per Employee (This Week)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} />
            <YAxis stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} />
            <Tooltip contentStyle={{ background: '#0f0f11', border: `1px solid ${GRID}`, color: '#e8e8ee' }} />
            <Legend wrapperStyle={{ color: '#a0a0b0' }} />
            <Line type="monotone" dataKey="hours" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT }} name="Scheduled Hrs" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

