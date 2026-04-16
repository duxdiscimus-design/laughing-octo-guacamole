import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader, Sparkles, Bot, User, ChevronDown } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { TASK_TYPES, DAYS_OF_WEEK } from '../constants';

// ─── Gemini API helper ────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL   = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

async function callGemini(apiKey, messages) {
  const body = {
    contents: messages,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    systemInstruction: {
      parts: [{
        text: `You are a scheduling assistant for a retail store (Harbor Freight Tools).
You help managers read and edit the employee schedule.

When asked to perform a schedule action, respond ONLY with a JSON block (no markdown fences) like:
{"action":"<ACTION>","params":{...},"message":"<friendly description of what you did>"}

Valid actions:
- "give_day_off":   {"empName":"<name>","dayIndex":0-6,"weekIndex":0-3}
- "set_shift":      {"empName":"<name>","dayIndex":0-6,"weekIndex":0-3,"startTime":"HH:MM","endTime":"HH:MM"}
- "remove_block":   {"empName":"<name>","dayIndex":0-6,"weekIndex":0-3,"blockType":"<type>"}
- "generate_week":  {"weekIndex":0-3}
- "none":           just a plain answer — use {"action":"none","params":{},"message":"<your answer>"}

Days: 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat,6=Sun
Weeks: 0-3 (current rotation)

If the user's request is unclear, ask for clarification using action:"none".`,
      }],
    },
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
}

// ─── Parse an action response from the model ─────────────────────────────────

function parseAction(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from within the text
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return { action: 'none', params: {}, message: text };
  }
}

// ─── Build a concise schedule summary for context ────────────────────────────

function buildScheduleContext(employees, scheduleData, currentWeek) {
  const lines = [`Current week: ${currentWeek + 1} (index ${currentWeek})`];
  lines.push(`Employees: ${employees.map(e => `${e.name} (${e.role})`).join(', ')}`);

  for (let w = 0; w < 4; w++) {
    const weekData = scheduleData[w];
    if (!weekData) continue;
    lines.push(`\nWeek ${w + 1}:`);
    for (const emp of employees) {
      const empWeek = weekData[emp.id];
      if (!empWeek) continue;
      const days = DAYS_OF_WEEK.map((dayName, d) => {
        const day = empWeek[d];
        if (!day || day.isOff) return `${dayName}:OFF`;
        if (day.isApprovedOff) return `${dayName}:ApprovedOff`;
        const types = [...new Set((day.blocks || [])
          .filter(b => b.type !== 'Lunch')
          .map(b => b.type))].join('+');
        return `${dayName}:${day.startTime ?? '?'}-${day.endTime ?? '?'}(${types || 'OFF'})`;
      });
      lines.push(`  ${emp.name}: ${days.join(' | ')}`);
    }
  }
  return lines.join('\n');
}

// ─── Main AIAssistant component ───────────────────────────────────────────────

export default function AIAssistant() {
  const { settings, employees } = useAppState();
  const { scheduleData, getWeekSchedule, setDaySchedule, generateWeekSchedule } = useSchedule();
  const { currentWeek } = useRotation();

  const apiKey = settings?.geminiApiKey ?? '';

  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi! I\'m your AI scheduling assistant. I can help you read and edit the schedule. Try asking: "Give John Monday off" or "Show me who works Saturday this week."',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ─── Execute schedule action returned by the model ────────────────────────
  const executeAction = useCallback((action) => {
    if (!action || action.action === 'none') return action?.message ?? '';

    const { action: type, params, message } = action;

    if (type === 'give_day_off') {
      const { empName, dayIndex, weekIndex = currentWeek } = params;
      const emp = employees.find(e =>
        e.name.toLowerCase().includes(empName?.toLowerCase() ?? '__'),
      );
      if (!emp) return `I couldn't find an employee named "${empName}".`;

      const weekData = getWeekSchedule(weekIndex);
      const existing = weekData[emp.id]?.[dayIndex] ?? { blocks: [] };
      setDaySchedule(weekIndex, emp.id, dayIndex, { ...existing, isOff: true, blocks: [] });
      return message || `Marked ${emp.name} as off on ${DAYS_OF_WEEK[dayIndex]} (week ${weekIndex + 1}).`;
    }

    if (type === 'set_shift') {
      const { empName, dayIndex, weekIndex = currentWeek, startTime, endTime } = params;
      const emp = employees.find(e =>
        e.name.toLowerCase().includes(empName?.toLowerCase() ?? '__'),
      );
      if (!emp) return `I couldn't find an employee named "${empName}".`;

      const weekData = getWeekSchedule(weekIndex);
      const existing = weekData[emp.id]?.[dayIndex] ?? { blocks: [] };
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;
      const newBlock = {
        id: `ai_${Date.now()}`,
        type: 'Floor',
        startTime,
        endTime,
        durationHours: (eMin - sMin) / 60,
      };
      setDaySchedule(weekIndex, emp.id, dayIndex, {
        ...existing,
        isOff: false,
        blocks: [newBlock],
        startTime,
        endTime,
        totalHours: (eMin - sMin) / 60,
        isManualOverride: true,
      });
      return message || `Set ${emp.name}'s shift on ${DAYS_OF_WEEK[dayIndex]} (week ${weekIndex + 1}) to ${startTime}–${endTime}.`;
    }

    if (type === 'remove_block') {
      const { empName, dayIndex, weekIndex = currentWeek, blockType } = params;
      const emp = employees.find(e =>
        e.name.toLowerCase().includes(empName?.toLowerCase() ?? '__'),
      );
      if (!emp) return `I couldn't find an employee named "${empName}".`;

      const weekData = getWeekSchedule(weekIndex);
      const existing = weekData[emp.id]?.[dayIndex] ?? { blocks: [] };
      const filtered = (existing.blocks || []).filter(b =>
        blockType ? b.type !== blockType : false,
      );
      setDaySchedule(weekIndex, emp.id, dayIndex, { ...existing, blocks: filtered, isManualOverride: true });
      return message || `Removed ${blockType} block for ${emp.name} on ${DAYS_OF_WEEK[dayIndex]} (week ${weekIndex + 1}).`;
    }

    if (type === 'generate_week') {
      const { weekIndex = currentWeek } = params;
      generateWeekSchedule(weekIndex, employees, {}, [], { startDate: null });
      return message || `Regenerated schedule for week ${weekIndex + 1}.`;
    }

    return message || 'Done.';
  }, [employees, currentWeek, getWeekSchedule, setDaySchedule, generateWeekSchedule]);

  // ─── Send a message ────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) {
      setError('No Gemini API key configured. Go to Settings → AI Assistant.');
      return;
    }

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // Build context
      const schedCtx = buildScheduleContext(employees, scheduleData, currentWeek);

      // Build Gemini conversation
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
      history.push({
        role: 'user',
        parts: [{ text: `Schedule context:\n${schedCtx}\n\nUser request: ${text}` }],
      });

      const raw  = await callGemini(apiKey, history);
      const act  = parseAction(raw);
      const reply = executeAction(act);

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, apiKey, messages, employees, scheduleData, currentWeek, executeAction]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

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
        title="AI Schedule Assistant"
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
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(520px, calc(100vh - 120px))',
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
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#f5c842' }}
              >
                <Sparkles size={14} style={{ color: '#0f0f11' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#e8e8ee' }}>AI Assistant</div>
                <div className="text-[10px]" style={{ color: apiKey ? '#22c55e' : '#ef4444' }}>
                  {apiKey ? 'Gemini · Active' : 'No API key — configure in Settings'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: '#6b7280', backgroundColor: '#2a2a32' }}
            >
              <X size={15} />
            </button>
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
                  className="px-3 py-2 rounded-xl text-sm max-w-[80%] whitespace-pre-wrap"
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
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32' }}>
                  <Loader size={14} className="animate-spin" style={{ color: '#f5c842' }} />
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {[
                'Who works this Saturday?',
                'Give me a summary of this week',
                'Generate schedule for week 1',
              ].map((s) => (
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

          {/* Input */}
          <div
            className="flex gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid #2a2a32', backgroundColor: '#0f0f11' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about the schedule…"
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl text-sm resize-none"
              style={{
                backgroundColor: '#1a1a1f',
                border: '1px solid #2a2a32',
                color: '#e8e8ee',
                outline: 'none',
                maxHeight: 80,
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
