import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader, Sparkles, Bot, User, Trash2 } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TASK_TYPES, DAYS_OF_WEEK, ROLES } from '../constants';

// ─── Gemini API ───────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL   = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

const SYSTEM_PROMPT = `You are an AI assistant for a retail store scheduling app (Harbor Freight Tools).
You can read and control every feature of the app via text commands.

Respond ONLY with a single JSON object (no markdown, no explanation outside JSON):
{"action":"<ACTION>","params":{...},"message":"<friendly plain-text confirmation>"}

═══ SCHEDULE ACTIONS ═══
give_day_off    – Mark employee off for a day
  params: {empName, dayIndex:0-6, weekIndex:0-3}

set_shift       – Set an employee's shift time (replaces all blocks with one Floor block)
  params: {empName, dayIndex:0-6, weekIndex:0-3, startTime:"HH:MM", endTime:"HH:MM"}

add_block       – Add a specific task block to an employee's day
  params: {empName, dayIndex:0-6, weekIndex:0-3, blockType:"LOD|Cashier|Planning|ConfCall|Floor|Open|Close|CashOffice|Custom", startTime:"HH:MM", endTime:"HH:MM"}

remove_block    – Remove blocks of a given type from an employee's day
  params: {empName, dayIndex:0-6, weekIndex:0-3, blockType:"<type>"}

generate_week   – Regenerate schedule for a week using current employees and rules
  params: {weekIndex:0-3}

clear_week      – Clear all schedule data for a week
  params: {weekIndex:0-3}

swap_shifts     – Swap two employees' entire shift on a given day
  params: {empName1, empName2, dayIndex:0-6, weekIndex:0-3}

═══ STAFF ACTIONS ═══
add_employee    – Add a new employee
  params: {name, role:"SM|AM|SUP|FTC|PT", targetHours:40, shiftLength:8, hourlyRate:15, lunchMinutes:30}

update_employee – Update one or more fields of an employee
  params: {empName, updates:{name?, role?, targetHours?, shiftLength?, hourlyRate?, lunchMinutes?, notes?}}

delete_employee – Remove an employee
  params: {empName}

═══ RULES ACTIONS ═══
toggle_rule     – Turn a scheduling rule on or off
  params: {ruleName, isOn:true|false}

delete_rule     – Delete a rule by name
  params: {ruleName}

═══ SETTINGS ACTIONS ═══
update_settings – Change app settings
  params: {updates:{storeName?, storeOpen?, storeClose?, geminiApiKey?}}

═══ LABOR ACTIONS ═══
set_labor_budget    – Set the weekly labor budget
  params: {weeklyBudget:5000}

update_employee_rate – Change an employee's hourly pay rate
  params: {empName, hourlyRate:18.50}

═══ REQUESTS ACTIONS ═══
add_request     – Submit a time-off or schedule-change request
  params: {empName, startDate:"YYYY-MM-DD", endDate:"YYYY-MM-DD", type:"TimeOff", notes?}

approve_request – Approve a pending request (match by employee name + date)
  params: {empName, startDate:"YYYY-MM-DD"}

deny_request    – Deny a pending request
  params: {empName, startDate:"YYYY-MM-DD"}

═══ QUERY (no mutation) ═══
none            – Answer a question or explain something
  params: {}
  (put the full plain-text answer in "message")

══════════════════════════
Days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
Weeks: 0–3 (4-week rotation, current week noted in context)
Task block types: LOD, Cashier, Planning, ConfCall, Floor, Open, Close, Lunch, CashOffice, Custom, ApprovedOff
Roles: SM (store manager), AM (assistant manager), SUP (supervisor), FTC (full-time cashier), PT (part-time)

Rules: match rules by partial name, case-insensitive.
Employees: match by partial name, case-insensitive.
If a request is ambiguous, pick the most likely interpretation and confirm in "message".
If something is impossible, use action:"none" and explain why in "message".`;

async function callGemini(apiKey, history) {
  const body = {
    contents: history,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  };

  const res = await fetch(GEMINI_URL(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

// ─── Parse JSON action from model response ────────────────────────────────────

function parseAction(text) {
  // Strip possible markdown code fences
  const stripped = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return { action: 'none', params: {}, message: stripped };
  }
}

// ─── Build rich context injected into every user message ─────────────────────

function buildContext(employees, scheduleData, rules, requests, laborBudget, settings, currentWeek) {
  const lines = [];

  // Store + current week
  lines.push(`Store: ${settings?.storeName || 'Harbor Freight Tools'}`);
  lines.push(`Hours: ${settings?.storeOpen || '07:30'}–${settings?.storeClose || '20:30'} (weekdays), 08:30–18:30 (Sunday)`);
  lines.push(`Current week index: ${currentWeek} (Week ${currentWeek + 1} of 4)`);

  // Employees table
  lines.push('\nEMPLOYEES:');
  for (const e of employees) {
    lines.push(`  id=${e.id} name="${e.name}" role=${e.role} target=${e.targetHours}h/wk shift=${e.shiftLength}h rate=$${e.hourlyRate}/hr`);
  }

  // Rules
  if (rules?.length) {
    lines.push('\nRULES:');
    for (const r of rules) {
      lines.push(`  [${r.isOn ? 'ON' : 'OFF'}] "${r.name}" (${r.enforcementType}) severity=${r.severity}`);
    }
  } else {
    lines.push('\nRULES: none configured');
  }

  // Labor budget
  if (laborBudget?.weeklyBudget) {
    lines.push(`\nLABOR BUDGET: $${laborBudget.weeklyBudget}/week`);
  }

  // Pending requests
  const pending = (requests || []).filter(r => r.status === 'Pending');
  if (pending.length) {
    lines.push('\nPENDING REQUESTS:');
    for (const r of pending) {
      lines.push(`  "${r.employeeName}" ${r.type} ${r.startDate}${r.endDate !== r.startDate ? '–' + r.endDate : ''}`);
    }
  }

  // Schedule summary (all 4 weeks)
  lines.push('\nSCHEDULE:');
  for (let w = 0; w < 4; w++) {
    const weekData = scheduleData[w];
    if (!weekData) { lines.push(`  Week ${w + 1}: not generated`); continue; }
    lines.push(`  Week ${w + 1}:`);
    for (const emp of employees) {
      const empWeek = weekData[emp.id];
      if (!empWeek) continue;
      const days = DAYS_OF_WEEK.map((dayName, d) => {
        const day = empWeek[d];
        if (!day || day.isOff) return `${dayName}:OFF`;
        if (day.isApprovedOff) return `${dayName}:ApprOff`;
        const types = [...new Set((day.blocks || [])
          .filter(b => b.type !== 'Lunch')
          .map(b => b.type))].join('+') || 'shift';
        const s = day.startTime ?? day.blocks?.[0]?.startTime ?? '?';
        const e2 = day.endTime   ?? day.blocks?.[day.blocks.length - 1]?.endTime ?? '?';
        return `${dayName}:${s}-${e2}(${types})`;
      });
      lines.push(`    ${emp.name}: ${days.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

// ─── Helper: find employee by partial name ────────────────────────────────────

function findEmployee(employees, name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return employees.find(e => e.name.toLowerCase().includes(n)) ?? null;
}

// ─── Helper: build a single block object ─────────────────────────────────────

function makeAiBlock(blockType, startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return {
    id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: blockType,
    startTime,
    endTime,
    durationHours: (eh * 60 + em - (sh * 60 + sm)) / 60,
  };
}

// ─── Main AIAssistant component ───────────────────────────────────────────────

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: "Hi! I'm your AI assistant. I can control every feature of the app — schedule, staff, rules, settings, labor, and requests.\n\nTry: \"Give John Monday off\" · \"Set Sarah's shift to 9am–5pm on Tuesday\" · \"Add a cashier block for Mike on Friday 2pm–6pm\" · \"Toggle the MAX_DAYS rule on\" · \"Add employee Jane as FTC at $16/hr\" · \"Set weekly budget to $8000\"",
};

export default function AIAssistant() {
  const {
    settings, setSettings,
    employees, setEmployees,
    rules, setRules,
    requests, setRequests,
    laborBudget, setLaborBudget,
    rotationStart,
  } = useAppState();
  const { scheduleData, getWeekSchedule, setDaySchedule, generateWeekSchedule, clearWeekSchedule } = useSchedule();
  const { currentWeek } = useRotation();
  const [availability, setAvailability] = useLocalStorage('hft_availability', {});

  const apiKey = settings?.geminiApiKey ?? '';

  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // ─── Action executor ──────────────────────────────────────────────────────
  const executeAction = useCallback((action) => {
    if (!action) return 'No action parsed.';
    const { action: type, params = {}, message } = action;

    // ── SCHEDULE ──────────────────────────────────────────────────────────

    if (type === 'give_day_off') {
      const { empName, dayIndex, weekIndex = currentWeek } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      const existing = getWeekSchedule(weekIndex)[emp.id]?.[dayIndex] ?? {};
      setDaySchedule(weekIndex, emp.id, dayIndex, { ...existing, isOff: true, blocks: [] });
      return message || `Marked ${emp.name} as OFF on ${DAYS_OF_WEEK[dayIndex]} (week ${weekIndex + 1}).`;
    }

    if (type === 'set_shift') {
      const { empName, dayIndex, weekIndex = currentWeek, startTime, endTime } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      const block = makeAiBlock('Floor', startTime, endTime);
      setDaySchedule(weekIndex, emp.id, dayIndex, {
        isOff: false,
        blocks: [block],
        startTime,
        endTime,
        totalHours: block.durationHours,
        isManualOverride: true,
      });
      return message || `Set ${emp.name}'s shift on ${DAYS_OF_WEEK[dayIndex]} (wk ${weekIndex + 1}): ${startTime}–${endTime}.`;
    }

    if (type === 'add_block') {
      const { empName, dayIndex, weekIndex = currentWeek, blockType, startTime, endTime } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      if (!TASK_TYPES.includes(blockType)) return `Unknown block type "${blockType}". Valid: ${TASK_TYPES.join(', ')}.`;
      const weekData = getWeekSchedule(weekIndex);
      const existing = weekData[emp.id]?.[dayIndex] ?? { blocks: [] };
      const newBlock = makeAiBlock(blockType, startTime, endTime);
      const updatedBlocks = [...(existing.blocks || []), newBlock]
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setDaySchedule(weekIndex, emp.id, dayIndex, {
        ...existing,
        isOff: false,
        blocks: updatedBlocks,
        isManualOverride: true,
      });
      return message || `Added ${blockType} block for ${emp.name} on ${DAYS_OF_WEEK[dayIndex]} (wk ${weekIndex + 1}): ${startTime}–${endTime}.`;
    }

    if (type === 'remove_block') {
      const { empName, dayIndex, weekIndex = currentWeek, blockType } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      const weekData = getWeekSchedule(weekIndex);
      const existing = weekData[emp.id]?.[dayIndex] ?? { blocks: [] };
      // Keep all blocks when no type given; remove matching type when given
      const filtered = (existing.blocks || []).filter(b =>
        blockType ? b.type !== blockType : true,
      );
      setDaySchedule(weekIndex, emp.id, dayIndex, { ...existing, blocks: filtered, isManualOverride: true });
      return message || `Removed ${blockType ? blockType + ' blocks' : 'blocks'} for ${emp.name} on ${DAYS_OF_WEEK[dayIndex]} (wk ${weekIndex + 1}).`;
    }

    if (type === 'generate_week') {
      const { weekIndex = currentWeek } = params;
      const activeRules = (rules || []).filter(r => r.isOn);
      generateWeekSchedule(weekIndex, employees, {}, activeRules, { startDate: rotationStart });
      return message || `Regenerated schedule for week ${weekIndex + 1}.`;
    }

    if (type === 'clear_week') {
      const { weekIndex = currentWeek } = params;
      clearWeekSchedule(weekIndex);
      return message || `Cleared schedule for week ${weekIndex + 1}.`;
    }

    if (type === 'swap_shifts') {
      const { empName1, empName2, dayIndex, weekIndex = currentWeek } = params;
      const emp1 = findEmployee(employees, empName1);
      const emp2 = findEmployee(employees, empName2);
      if (!emp1) return `Employee "${empName1}" not found.`;
      if (!emp2) return `Employee "${empName2}" not found.`;
      const weekData = getWeekSchedule(weekIndex);
      const day1 = weekData[emp1.id]?.[dayIndex] ?? { blocks: [] };
      const day2 = weekData[emp2.id]?.[dayIndex] ?? { blocks: [] };
      setDaySchedule(weekIndex, emp1.id, dayIndex, { ...day2, isManualOverride: true });
      setDaySchedule(weekIndex, emp2.id, dayIndex, { ...day1, isManualOverride: true });
      return message || `Swapped shifts between ${emp1.name} and ${emp2.name} on ${DAYS_OF_WEEK[dayIndex]} (wk ${weekIndex + 1}).`;
    }

    // ── STAFF ─────────────────────────────────────────────────────────────

    if (type === 'add_employee') {
      const { name, role = 'FTC', targetHours = 36, shiftLength = 8, hourlyRate = 15, lunchMinutes = 30 } = params;
      if (!name) return 'Employee name is required.';
      if (!ROLES.includes(role)) return `Invalid role "${role}". Valid: ${ROLES.join(', ')}.`;
      const newEmp = {
        id: crypto.randomUUID(),
        name: name.trim(),
        role,
        targetHours: Number(targetHours),
        shiftLength: Number(shiftLength),
        hourlyRate: Number(hourlyRate),
        lunchMinutes: Number(lunchMinutes),
        lunchPaid: lunchMinutes > 0,
        planningHours: ['SM', 'AM', 'SUP'].includes(role) ? (role === 'SM' ? 20 : role === 'AM' ? 6 : 3) : 0,
        notes: '',
      };
      setEmployees(prev => [...prev, newEmp]);
      return message || `Added employee "${newEmp.name}" (${role}, $${hourlyRate}/hr, ${targetHours}h/wk).`;
    }

    if (type === 'update_employee') {
      const { empName, updates = {} } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updates } : e));
      const changed = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ');
      return message || `Updated ${emp.name}: ${changed}.`;
    }

    if (type === 'delete_employee') {
      const { empName } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      return message || `Deleted employee "${emp.name}".`;
    }

    // ── RULES ─────────────────────────────────────────────────────────────

    if (type === 'toggle_rule') {
      const { ruleName, isOn } = params;
      const rule = (rules || []).find(r => r.name?.toLowerCase().includes((ruleName ?? '').toLowerCase()));
      if (!rule) return `Rule "${ruleName}" not found.`;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isOn: Boolean(isOn) } : r));
      return message || `Rule "${rule.name}" is now ${isOn ? 'ON' : 'OFF'}.`;
    }

    if (type === 'delete_rule') {
      const { ruleName } = params;
      const rule = (rules || []).find(r => r.name?.toLowerCase().includes((ruleName ?? '').toLowerCase()));
      if (!rule) return `Rule "${ruleName}" not found.`;
      setRules(prev => prev.filter(r => r.id !== rule.id));
      return message || `Deleted rule "${rule.name}".`;
    }

    // ── SETTINGS ──────────────────────────────────────────────────────────

    if (type === 'update_settings') {
      const { updates = {} } = params;
      setSettings(prev => ({ ...prev, ...updates }));
      const changed = Object.entries(updates).map(([k, v]) => `${k}="${v}"`).join(', ');
      return message || `Settings updated: ${changed}.`;
    }

    // ── LABOR ─────────────────────────────────────────────────────────────

    if (type === 'set_labor_budget') {
      const { weeklyBudget } = params;
      setLaborBudget(prev => ({ ...prev, weeklyBudget: Number(weeklyBudget) }));
      return message || `Weekly labor budget set to $${weeklyBudget}.`;
    }

    if (type === 'update_employee_rate') {
      const { empName, hourlyRate } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, hourlyRate: Number(hourlyRate) } : e));
      return message || `Updated ${emp.name}'s hourly rate to $${hourlyRate}/hr.`;
    }

    // ── REQUESTS ──────────────────────────────────────────────────────────

    if (type === 'add_request') {
      const { empName, startDate, endDate, type: reqType = 'TimeOff', notes = '' } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      if (!startDate) return 'startDate (YYYY-MM-DD) is required.';
      const newReq = {
        id: crypto.randomUUID(),
        employeeId: emp.id,
        employeeName: emp.name,
        type: reqType,
        subtype: 'dateRange',
        startDate,
        endDate: endDate || startDate,
        notes,
        status: 'Pending',
        createdAt: Date.now(),
      };
      setRequests(prev => [newReq, ...(prev || [])]);
      return message || `Submitted ${reqType} request for ${emp.name} (${startDate}${endDate && endDate !== startDate ? '–' + endDate : ''}).`;
    }

    if (type === 'approve_request' || type === 'deny_request') {
      const { empName, startDate } = params;
      const emp = findEmployee(employees, empName);
      if (!emp) return `Employee "${empName}" not found.`;
      const req = (requests || []).find(r =>
        r.employeeId === emp.id && r.startDate === startDate && r.status === 'Pending',
      );
      if (!req) return `No pending request found for ${emp.name} on ${startDate}.`;
      const newStatus = type === 'approve_request' ? 'Approved' : 'Denied';
      if (type === 'approve_request') {
        // Also add an availability block so the schedule generator respects the time off
        setAvailability(prev => {
          const cur = prev[emp.id] || { recurring: {}, dateBlocks: [] };
          return {
            ...prev,
            [emp.id]: {
              ...cur,
              dateBlocks: [...(cur.dateBlocks || []), {
                id: req.id,
                start: req.startDate,
                end: req.endDate || req.startDate,
                label: 'Approved Time Off',
                isApproved: true,
              }],
            },
          };
        });
      }
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
      return message || `${newStatus} time-off request for ${emp.name} (${startDate}).`;
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────
    if (type === 'none') return action.message || '';
    return message || `Unknown action "${type}".`;
  }, [
    employees, setEmployees,
    rules, setRules,
    requests, setRequests,
    settings, setSettings,
    laborBudget, setLaborBudget,
    availability, setAvailability,
    scheduleData, getWeekSchedule, setDaySchedule, generateWeekSchedule, clearWeekSchedule,
    currentWeek, rotationStart,
  ]);

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) {
      setError('No Gemini API key — go to Settings → AI Assistant to configure one.');
      return;
    }

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // Build fresh context for every call
      const ctx = buildContext(employees, scheduleData, rules, requests, laborBudget, settings, currentWeek);

      // Build Gemini conversation history (must start with 'user', skip leading greeting)
      const conversationMessages = messages.filter(
        (m, i) => !(i === 0 && m.role === 'assistant'),
      );

      const geminiHistory = conversationMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      // Append the new user message with injected context
      geminiHistory.push({
        role: 'user',
        parts: [{ text: `--- APP CONTEXT ---\n${ctx}\n--- END CONTEXT ---\n\nRequest: ${text}` }],
      });

      const raw   = await callGemini(apiKey, geminiHistory);
      const act   = parseAction(raw);
      const reply = executeAction(act);

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      const msg = err.message || 'Unknown error';
      setError(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [
    input, loading, apiKey, messages,
    employees, scheduleData, rules, requests, laborBudget, settings,
    currentWeek, executeAction,
  ]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  };

  // ─── Quick prompts (shown when conversation is fresh) ─────────────────────
  const QUICK_PROMPTS = [
    "Who works this Saturday?",
    "Generate schedule for week 1",
    "Give me a labor cost summary",
    "Toggle MAX_DAYS rule on",
    "Show pending requests",
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl font-semibold text-sm"
        style={{
          backgroundColor: apiKey ? '#f5c842' : '#2a2a32',
          color: apiKey ? '#0f0f11' : '#e8e8ee',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        title="AI Assistant"
        aria-label="Open AI Assistant"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">AI Assistant</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(440px, calc(100vw - 24px))',
            height: 'min(560px, calc(100vh - 112px))',
            backgroundColor: '#1a1a1f',
            border: '1px solid #2a2a32',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: '#0f0f11', borderBottom: '1px solid #2a2a32' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#f5c842' }}
              >
                <Sparkles size={13} style={{ color: '#0f0f11' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#e8e8ee' }}>AI Assistant</div>
                <div className="text-[10px]" style={{ color: apiKey ? '#22c55e' : '#ef4444' }}>
                  {apiKey ? 'Gemini 2.0 Flash · Full control' : 'No API key — configure in Settings'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#6b7280', backgroundColor: '#2a2a32' }}
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#6b7280', backgroundColor: '#2a2a32' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: m.role === 'user' ? '#3b82f6' : '#2a2a32' }}
                >
                  {m.role === 'user'
                    ? <User size={13} style={{ color: '#fff' }} />
                    : <Bot  size={13} style={{ color: '#f5c842' }} />}
                </div>
                <div
                  className="px-3 py-2 rounded-xl text-sm max-w-[82%] whitespace-pre-wrap break-words"
                  style={{
                    backgroundColor: m.role === 'user' ? '#1e3a5f' : '#0f0f11',
                    color: '#e8e8ee',
                    border: `1px solid ${m.role === 'user' ? '#2563eb44' : '#2a2a32'}`,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2a2a32' }}>
                  <Bot size={13} style={{ color: '#f5c842' }} />
                </div>
                <div className="px-3 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32' }}>
                  <Loader size={14} className="animate-spin" style={{ color: '#f5c842' }} />
                  <span className="text-xs" style={{ color: '#6b7280' }}>Thinking…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (visible when conversation has only the greeting) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-2 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#2a2a32', color: '#a0a0b0', border: '1px solid #3a3a44' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div
            className="flex gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid #2a2a32', backgroundColor: '#0f0f11' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Command anything — schedule, staff, rules, settings…"
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl text-sm resize-none"
              style={{
                backgroundColor: '#1a1a1f',
                border: '1px solid #2a2a32',
                color: '#e8e8ee',
                outline: 'none',
                maxHeight: 88,
                minHeight: 40,
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 self-end disabled:opacity-40"
              style={{ backgroundColor: '#f5c842', color: '#0f0f11' }}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
