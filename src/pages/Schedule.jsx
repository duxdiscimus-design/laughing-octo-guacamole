import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Zap, Printer,
  X, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import {
  DndContext, DragOverlay, useDraggable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useRotation } from '../hooks/useRotation';
import { useRules } from '../hooks/useRules';
import { autoOptimize } from '../engine/rulesEngine';
import { TASK_TYPES, TASK_COLORS, DAYS_OF_WEEK } from '../constants';

// ─── Timeline constants ──────────────────────────────────────────────────────
const TL_START = 7 * 60;   // 7:00 AM in minutes
const TL_END   = 21 * 60;  // 9:00 PM in minutes
const SLOT_MIN = 30;
const NUM_SLOTS = (TL_END - TL_START) / SLOT_MIN; // 28

const APPROVED_OFF_STYLE = {
  backgroundColor: '#2a2a32',
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',
};

const DARK_TEXT_TASKS = new Set(['LOD', 'Floor', 'Open']);

// ─── Pure helpers ────────────────────────────────────────────────────────────
const timeToMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const fmtTimeShort = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const hour = h % 12 || 12;
  const suf  = h >= 12 ? 'p' : 'a';
  return m ? `${hour}:${String(m).padStart(2, '0')}${suf}` : `${hour}${suf}`;
};

const taskTextColor = (type) => (DARK_TEXT_TASKS.has(type) ? '#0f0f11' : '#ffffff');

const getPrimary = (blocks) => {
  if (!blocks?.length) return null;
  const nonLunch = blocks.filter((b) => b.type !== 'Lunch');
  if (!nonLunch.length) return blocks[0];
  return nonLunch.reduce((a, b) => (b.durationHours || 0) > (a.durationHours || 0) ? b : a);
};

const getDayHours = (dayData) => {
  if (!dayData?.blocks?.length) return 0;
  return dayData.blocks
    .filter((b) => b.type !== 'Lunch' && b.type !== 'ApprovedOff')
    .reduce((s, b) => s + (b.durationHours || 0), 0);
};

const getDayBounds = (dayData) => {
  if (!dayData?.blocks?.length) return null;
  const starts = dayData.blocks.map((b) => b.startTime).filter(Boolean);
  const ends   = dayData.blocks.map((b) => b.endTime).filter(Boolean);
  if (!starts.length) return null;
  return {
    start: starts.reduce((a, b) => (a < b ? a : b)),
    end:   ends.reduce((a, b)   => (a > b ? a : b)),
  };
};

// ─── ViolationBanner ─────────────────────────────────────────────────────────
function ViolationBanner({ violations, expanded, onToggle }) {
  if (!violations?.length) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg mb-3"
        style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
      >
        <CheckCircle size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
        <span className="text-sm" style={{ color: '#22c55e' }}>All clear — no violations</span>
      </div>
    );
  }

  const hard = violations.filter((v) => v.severity === 'HARD');
  const soft = violations.filter((v) => v.severity === 'SOFT');

  return (
    <div className="mb-3 rounded-lg overflow-hidden" style={{ border: '1px solid #2a2a32' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 min-h-[44px]"
        style={{ backgroundColor: hard.length ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} style={{ color: hard.length ? '#ef4444' : '#f97316', flexShrink: 0 }} />
          <span className="text-sm font-medium" style={{ color: '#e8e8ee' }}>
            {hard.length > 0 && `${hard.length} hard violation${hard.length !== 1 ? 's' : ''}`}
            {hard.length > 0 && soft.length > 0 && ', '}
            {soft.length > 0 && `${soft.length} soft warning${soft.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        {expanded
          ? <ChevronUp  size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
          : <ChevronDown size={15} style={{ color: '#6b7280', flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-1.5" style={{ backgroundColor: '#1a1a1f' }}>
          {hard.map((v, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span style={{ color: '#ef4444', flexShrink: 0 }}>●</span>
              <span style={{ color: '#e8e8ee' }}>{v.message}</span>
            </div>
          ))}
          {soft.map((v, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span style={{ color: '#f97316', flexShrink: 0 }}>●</span>
              <span style={{ color: '#e8e8ee' }}>{v.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WeekCell ─────────────────────────────────────────────────────────────────
function WeekCell({ dayData, onClick }) {
  const isOff     = !dayData || dayData.isOff;
  const primary   = getPrimary(dayData?.blocks);
  const isApprOff = !isOff && primary?.type === 'ApprovedOff';

  const baseStyle = {
    minHeight: 44,
    cursor: 'pointer',
    borderRadius: 6,
    padding: '6px 8px',
    border: '1px solid transparent',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  };

  if (isApprOff) {
    return (
      <div onClick={onClick} style={{ ...baseStyle, ...APPROVED_OFF_STYLE, border: '1px solid #2a2a32' }}>
        <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Approved Off</span>
      </div>
    );
  }

  if (isOff) {
    return (
      <div onClick={onClick} style={{ ...baseStyle, backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
        <span className="text-xs font-medium" style={{ color: '#4b4b58' }}>OFF</span>
      </div>
    );
  }

  const color  = TASK_COLORS[primary?.type] || '#6b7280';
  const tColor = taskTextColor(primary?.type);
  const bounds = getDayBounds(dayData);
  const hours  = getDayHours(dayData);

  return (
    <div
      onClick={onClick}
      style={{
        ...baseStyle,
        backgroundColor: `${color}1a`,
        border: `1px solid ${color}44`,
      }}
    >
      {bounds && (
        <span className="text-xs font-mono leading-none" style={{ color: '#a0a0b0' }}>
          {fmtTimeShort(bounds.start)}–{fmtTimeShort(bounds.end)}
        </span>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <span
          className="text-xs font-bold px-1 rounded leading-tight"
          style={{ backgroundColor: color, color: tColor, flexShrink: 0 }}
        >
          {primary?.type}
        </span>
        {hours > 0 && (
          <span className="text-xs" style={{ color: '#6b7280' }}>{hours.toFixed(1)}h</span>
        )}
      </div>
    </div>
  );
}

// ─── WeekOverview ────────────────────────────────────────────────────────────
function WeekOverview({ weekData, employees, onCellClick }) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 640 }}>
        {/* Column headers */}
        <div className="grid" style={{ gridTemplateColumns: '140px repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          <div />
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-xs font-semibold text-center py-1" style={{ color: '#6b7280' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="grid items-center"
              style={{ gridTemplateColumns: '140px repeat(7, 1fr)', gap: 4 }}
            >
              {/* Employee name */}
              <div className="pr-2">
                <div className="text-sm font-medium truncate" style={{ color: '#e8e8ee' }}>{emp.name}</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>{emp.role}</div>
              </div>

              {/* Day cells */}
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const dayData = weekData[emp.id]?.[dayIdx];
                return (
                  <WeekCell
                    key={dayIdx}
                    dayData={dayData}
                    onClick={() => onCellClick(dayIdx)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DraggableBlockWrapper ────────────────────────────────────────────────────
function DraggableBlockWrapper({ id, data, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: isDragging ? 0.35 : 1, touchAction: 'none' }}
    >
      {children}
    </div>
  );
}

// ─── TimelineBlock (visual) ───────────────────────────────────────────────────
function TimelineBlock({ block, isSelected, onClick }) {
  const startMin = timeToMin(block.startTime);
  const endMin   = timeToMin(block.endTime);
  const totalMin = TL_END - TL_START;

  const leftPct  = Math.max(0, ((startMin - TL_START) / totalMin) * 100);
  const widthPct = Math.max(0, Math.min(((endMin - startMin) / totalMin) * 100, 100 - leftPct));

  const color  = TASK_COLORS[block.type] || '#6b7280';
  const tColor = taskTextColor(block.type);
  const isApprOff = block.type === 'ApprovedOff';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left:    `${leftPct}%`,
        width:   `${widthPct}%`,
        top: 3,
        bottom: 3,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        outline: isSelected ? '2px solid #f5c842' : 'none',
        outlineOffset: 1,
        zIndex: 2,
        ...(isApprOff ? APPROVED_OFF_STYLE : { backgroundColor: color }),
      }}
    >
      <div
        className="h-full flex items-center px-1.5 text-xs font-semibold truncate select-none"
        style={{ color: tColor }}
      >
        {widthPct > 5 ? block.type : ''}
      </div>
    </div>
  );
}

// ─── DayTimeline ──────────────────────────────────────────────────────────────
function DayTimeline({ weekData, employees, selectedWeek, selectedDay, isMobile, onEditBlock, setBlockInDay }) {
  const trackRef = useRef(null);
  const [activeDrag, setActiveDrag]     = useState(null);
  const [mobileSelected, setMobileSelected] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const timeSlots = useMemo(() =>
    Array.from({ length: NUM_SLOTS }, (_, i) => {
      const min = TL_START + i * SLOT_MIN;
      return { min, label: fmtTimeShort(minToTime(min)) };
    }), []);

  const handleDragStart = useCallback((e) => {
    setActiveDrag(e.active.data.current);
  }, []);

  const handleDragEnd = useCallback((e) => {
    const { active, delta } = e;
    if (!trackRef.current) { setActiveDrag(null); return; }

    const trackWidth = trackRef.current.clientWidth;
    const totalMin   = TL_END - TL_START;
    const deltaMin   = (delta.x / trackWidth) * totalMin;
    const deltaSnapped = Math.round(deltaMin / SLOT_MIN) * SLOT_MIN;

    const { block, empId, dayIndex } = active.data.current;
    const origStart  = timeToMin(block.startTime);
    const duration   = timeToMin(block.endTime) - origStart;

    let newStart = origStart + deltaSnapped;
    newStart = Math.max(TL_START, Math.min(TL_END - SLOT_MIN, newStart));
    newStart = Math.round(newStart / SLOT_MIN) * SLOT_MIN;
    const newEnd = Math.min(TL_END, newStart + duration);

    setBlockInDay(selectedWeek, empId, dayIndex, block.id, {
      ...block,
      startTime: minToTime(newStart),
      endTime:   minToTime(newEnd),
      durationHours: (newEnd - newStart) / 60,
    });
    setActiveDrag(null);
  }, [selectedWeek, setBlockInDay]);

  // Mobile: tap on row to move selected block
  const handleRowTap = useCallback((e, empId) => {
    if (!isMobile || !mobileSelected || mobileSelected.empId !== empId) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const total = TL_END - TL_START;
    let newStart = TL_START + Math.round((pct * total) / SLOT_MIN) * SLOT_MIN;
    newStart = Math.max(TL_START, Math.min(TL_END - SLOT_MIN, newStart));
    const { block } = mobileSelected;
    const duration  = timeToMin(block.endTime) - timeToMin(block.startTime);
    const newEnd    = Math.min(TL_END, newStart + duration);

    setBlockInDay(selectedWeek, empId, selectedDay, block.id, {
      ...block,
      startTime: minToTime(newStart),
      endTime:   minToTime(newEnd),
      durationHours: (newEnd - newStart) / 60,
    });
    setMobileSelected(null);
  }, [isMobile, mobileSelected, selectedWeek, selectedDay, setBlockInDay]);

  const EMP_COL = 130;
  const SLOT_W  = 52; // px per 30-min slot
  const totalTrackPx = NUM_SLOTS * SLOT_W;

  const content = (
    <div className="overflow-x-auto">
      <div style={{ minWidth: EMP_COL + totalTrackPx }}>

        {/* Header: time slots */}
        <div className="flex sticky top-0 z-10" style={{ backgroundColor: '#0f0f11' }}>
          <div style={{ width: EMP_COL, flexShrink: 0, borderRight: '1px solid #2a2a32', borderBottom: '1px solid #2a2a32' }} />
          <div style={{ width: totalTrackPx, flexShrink: 0, borderBottom: '1px solid #2a2a32' }}>
            <div className="flex" ref={trackRef}>
              {timeSlots.map((slot, i) => (
                <div
                  key={i}
                  className="text-xs text-center"
                  style={{
                    width: SLOT_W,
                    flexShrink: 0,
                    color: '#6b7280',
                    padding: '3px 0',
                    borderRight: '1px solid #2a2a32',
                  }}
                >
                  {i % 2 === 0 ? slot.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee rows */}
        {employees.map((emp) => {
          const dayData = weekData[emp.id]?.[selectedDay];
          const blocks  = dayData?.blocks || [];
          const isOff   = !dayData || dayData.isOff;

          return (
            <div
              key={emp.id}
              className="flex"
              style={{ borderBottom: '1px solid #2a2a32', minHeight: 44 }}
            >
              {/* Name column */}
              <div
                style={{
                  width: EMP_COL, flexShrink: 0,
                  padding: '0 10px',
                  borderRight: '1px solid #2a2a32',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: '#e8e8ee', maxWidth: EMP_COL - 20 }} title={emp.name}>
                    {emp.name.length > 14 ? emp.name.slice(0, 13) + '…' : emp.name}
                  </div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{emp.role}</div>
                </div>
              </div>

              {/* Track */}
              <div
                style={{
                  width: totalTrackPx, flexShrink: 0,
                  position: 'relative',
                  cursor: isMobile && mobileSelected?.empId === emp.id ? 'crosshair' : 'default',
                  backgroundColor: isOff ? 'rgba(0,0,0,0.2)' : 'transparent',
                }}
                onClick={(ev) => handleRowTap(ev, emp.id)}
              >
                {/* Slot grid lines */}
                {timeSlots.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: i * SLOT_W,
                      width: SLOT_W,
                      borderRight: `1px solid ${i % 2 === 0 ? '#2a2a32' : '#1a1a1f'}`,
                    }}
                  />
                ))}

                {isOff
                  ? <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: '#4b4b58' }}>OFF</div>
                  : blocks.map((block) => {
                      const blockNode = (
                        <TimelineBlock
                          key={block.id}
                          block={block}
                          isSelected={mobileSelected?.block.id === block.id}
                          onClick={() => {
                            if (isMobile) {
                              setMobileSelected(
                                mobileSelected?.block.id === block.id
                                  ? null
                                  : { block, empId: emp.id },
                              );
                            } else {
                              onEditBlock(block, emp.id, selectedDay);
                            }
                          }}
                        />
                      );

                      if (isMobile) return blockNode;

                      return (
                        <DraggableBlockWrapper
                          key={block.id}
                          id={block.id}
                          data={{ block, empId: emp.id, dayIndex: selectedDay }}
                        >
                          {blockNode}
                        </DraggableBlockWrapper>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) return content;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {content}
      <DragOverlay>
        {activeDrag ? (
          <div
            className="px-2 py-1 rounded text-xs font-bold shadow-xl"
            style={{
              backgroundColor: TASK_COLORS[activeDrag.block?.type] || '#6b7280',
              color: taskTextColor(activeDrag.block?.type),
              opacity: 0.9,
            }}
          >
            {activeDrag.block?.type}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── EditBlockModal ───────────────────────────────────────────────────────────
function EditBlockModal({ block, empId, dayIndex, weekIndex, onSave, onDelete, onClose }) {
  const [type,      setType]      = useState(block.type);
  const [startTime, setStartTime] = useState(block.startTime || '07:30');
  const [endTime,   setEndTime]   = useState(block.endTime   || '16:30');

  const handleSave = () => {
    const s = timeToMin(startTime);
    const e = timeToMin(endTime);
    onSave({ ...block, type, startTime, endTime, durationHours: (e - s) / 60 });
  };

  const previewColor = TASK_COLORS[type] || '#6b7280';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
        style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base" style={{ color: '#e8e8ee' }}>Edit Block</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ color: '#6b7280', backgroundColor: '#2a2a32' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Block type */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Block Type</label>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: previewColor }} />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee' }}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32', color: '#e8e8ee' }}
              />
            </div>
          </div>

          {/* Duration preview */}
          {(() => {
            const dur = (timeToMin(endTime) - timeToMin(startTime)) / 60;
            return dur > 0 ? (
              <div className="text-xs" style={{ color: '#6b7280' }}>
                Duration: {dur.toFixed(1)} hour{dur !== 1 ? 's' : ''}
              </div>
            ) : null;
          })()}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onDelete(block.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px]"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm min-h-[44px]"
            style={{ backgroundColor: '#2a2a32', color: '#e8e8ee' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
            style={{ backgroundColor: '#f5c842', color: '#0f0f11' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DayShiftBreakdown ────────────────────────────────────────────────────────
// Full shift + task breakdown for the selected day, shown below the timeline.
function DayShiftBreakdown({ weekData, employees }) {
  const [expanded, setExpanded] = useState({});
  const toggleEmp = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const TASK_DESC = {
    LOD:         'Leader on Duty – supervise floor, handle escalations',
    Cashier:     'Operate register, process transactions, assist customers at checkout',
    Planning:    'Office planning, scheduling, ordering, administrative tasks',
    ConfCall:    'Company-wide conference call / store team meeting',
    Floor:       'Floor coverage – assist customers, restock, zone maintenance',
    Open:        'Opening procedures – doors, registers, safety walkthrough',
    Close:       'Closing procedures – registers, locks, end-of-day walkthrough',
    Lunch:       'Unpaid meal break',
    CashOffice:  'Cash office – count tills, process deposits, reconcile',
    Custom:      'Custom task as assigned',
    ApprovedOff: 'Approved time off',
  };

  const workerRows = employees
    .map(emp => ({ emp, day: weekData[emp.id] }))
    .filter(({ day }) => day && !day.isOff && !day.isApprovedOff && day.blocks?.length > 0);

  if (!workerRows.length) {
    return (
      <div className="mt-4 p-4 rounded-xl text-sm text-center" style={{ color: '#4b4b58', backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
        No scheduled employees for this day.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>
        Shift Breakdown — {workerRows.length} employee{workerRows.length !== 1 ? 's' : ''} on duty
      </div>

      {workerRows.map(({ emp, day }) => {
        const isExp    = expanded[emp.id];
        const hours    = getDayHours({ blocks: day.blocks });
        const bounds   = getDayBounds({ blocks: day.blocks });
        const workBlocks = (day.blocks || []).filter(b => b.type !== 'Lunch');
        const lunchBlk = (day.blocks || []).find(b => b.type === 'Lunch');

        return (
          <div
            key={emp.id}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
          >
            {/* Row header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => toggleEmp(emp.id)}
            >
              {/* Role badge */}
              <span
                className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#2a2a32', color: '#f5c842' }}
              >
                {emp.role}
              </span>
              {/* Name */}
              <span className="text-sm font-medium flex-1" style={{ color: '#e8e8ee' }}>{emp.name}</span>
              {/* Time range */}
              {bounds && (
                <span className="text-xs font-mono" style={{ color: '#a0a0b0' }}>
                  {fmtTimeShort(bounds.start)} – {fmtTimeShort(bounds.end)}
                </span>
              )}
              {/* Hours */}
              <span className="text-xs ml-2" style={{ color: '#6b7280' }}>{hours.toFixed(1)}h</span>
              {/* Expand */}
              <ChevronDown
                size={14}
                style={{ color: '#6b7280', transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
              />
            </button>

            {/* Expanded detail */}
            {isExp && (
              <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: '#2a2a32' }}>
                {/* Block list */}
                <div className="pt-3 space-y-1.5">
                  {workBlocks.map((block, i) => {
                    const color = TASK_COLORS[block.type] || '#6b7280';
                    const dur   = block.durationHours?.toFixed(1) ?? ((timeToMin(block.endTime) - timeToMin(block.startTime)) / 60).toFixed(1);
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color }}>{block.type}</span>
                            <span className="text-xs font-mono" style={{ color: '#6b7280' }}>
                              {fmtTimeShort(block.startTime)} – {fmtTimeShort(block.endTime)} ({dur}h)
                            </span>
                          </div>
                          {TASK_DESC[block.type] && (
                            <div className="text-xs mt-0.5" style={{ color: '#4b4b58' }}>
                              {TASK_DESC[block.type]}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {lunchBlk && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#6b7280' }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>Lunch</span>
                          <span className="text-xs font-mono" style={{ color: '#4b4b58' }}>
                            {fmtTimeShort(lunchBlk.startTime)} – {fmtTimeShort(lunchBlk.endTime)}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#4b4b58' }}>
                          {TASK_DESC['Lunch']}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary footer */}
                <div
                  className="flex gap-4 pt-2 mt-1 text-xs flex-wrap"
                  style={{ borderTop: '1px solid #2a2a32', color: '#6b7280' }}
                >
                  <span>Total on-duty: <strong style={{ color: '#a0a0b0' }}>{hours.toFixed(1)}h</strong></span>
                  {lunchBlk && <span>Lunch: <strong style={{ color: '#a0a0b0' }}>{((timeToMin(lunchBlk.endTime) - timeToMin(lunchBlk.startTime)) / 60).toFixed(1)}h</strong></span>}
                  <span>Blocks: <strong style={{ color: '#a0a0b0' }}>{workBlocks.length}</strong></span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Schedule component ──────────────────────────────────────────────────
export default function Schedule() {
  const { employees, rules, rotationStart, settings } = useAppState();
  const { scheduleData, getWeekSchedule, setDaySchedule, setBlockInDay, generateWeekSchedule } = useSchedule();
  const { getWeekStartDate, weekLabel, currentWeek, initRotation } = useRotation();
  const { getViolations } = useRules();

  const [view,           setView]           = useState('week');
  const [selectedDay,    setSelectedDay]    = useState(0);
  const [selectedWeek,   setSelectedWeek]   = useState(() => currentWeek);
  const [printMode,      setPrintMode]      = useState(false);
  const [violExpanded,   setViolExpanded]   = useState(false);
  const [editModal,      setEditModal]      = useState(null); // { block, empId, dayIndex }
  const [isMobile,       setIsMobile]       = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [optimizing,     setOptimizing]     = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Init rotation if needed (run once on mount; intentionally omit initRotation from deps
  // because it is not memoized in useRotation and would cause an infinite loop)
  const initRotationRef = useRef(initRotation);
  initRotationRef.current = initRotation;
  useEffect(() => {
    if (!rotationStart) initRotationRef.current();
  }, [rotationStart]);

  const weekData = useMemo(
    () => getWeekSchedule(selectedWeek),
    [scheduleData, selectedWeek, getWeekSchedule],
  );

  // Week date range
  const weekStart = useMemo(() => {
    if (!rotationStart) return null;
    return getWeekStartDate(selectedWeek);
  }, [rotationStart, selectedWeek]);

  const weekDateRange = useMemo(() => {
    if (!weekStart) return 'Week not set';
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [weekStart]);

  // Day header label
  const selectedDayLabel = useMemo(() => {
    if (!weekStart) return DAYS_OF_WEEK[selectedDay];
    const d = addDays(weekStart, selectedDay);
    return `${DAYS_OF_WEEK[selectedDay]}, ${format(d, 'MMM d')}`;
  }, [weekStart, selectedDay]);

  // Violations
  const violations = useMemo(() => {
    try {
      return getViolations(scheduleData, employees, rotationStart, { settings }) || [];
    } catch {
      return [];
    }
  }, [scheduleData, employees, rules, rotationStart, settings, getViolations]);

  // Navigation
  const prevWeek = useCallback(() => setSelectedWeek((w) => (w - 1 + 4) % 4), []);
  const nextWeek = useCallback(() => setSelectedWeek((w) => (w + 1) % 4), []);

  // Generate
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const activeRules = rules.filter((r) => r.isOn);
      generateWeekSchedule(selectedWeek, employees, {}, activeRules, { startDate: rotationStart });
    } finally {
      setGenerating(false);
    }
  }, [selectedWeek, employees, rules, rotationStart, generateWeekSchedule]);

  // Auto-optimize
  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const activeRules = rules.filter((r) => r.isOn);
      // 1. Apply rule-based fixups to the current schedule
      const { optimizedSchedule } = autoOptimize(
        { [selectedWeek]: weekData },
        activeRules,
        employees,
        { startDate: rotationStart },
        { settings },
      );
      // 2. Regenerate the week fresh with the same rules applied in the engine
      generateWeekSchedule(selectedWeek, employees, {}, activeRules, { startDate: rotationStart });
    } finally {
      setOptimizing(false);
    }
  }, [selectedWeek, weekData, employees, rules, rotationStart, settings, generateWeekSchedule]);

  // Cell click → open day view
  const handleCellClick = useCallback((dayIdx) => {
    setSelectedDay(dayIdx);
    setView('day');
  }, []);

  // Edit block
  const handleEditBlock = useCallback((block, empId, dayIndex) => {
    setEditModal({ block, empId, dayIndex });
  }, []);

  const handleSaveBlock = useCallback((updatedBlock) => {
    if (!editModal) return;
    const { empId, dayIndex } = editModal;
    setBlockInDay(selectedWeek, empId, dayIndex, updatedBlock.id, updatedBlock);
    setEditModal(null);
  }, [editModal, selectedWeek, setBlockInDay]);

  const handleDeleteBlock = useCallback((blockId) => {
    if (!editModal) return;
    const { empId, dayIndex } = editModal;
    const dayData = weekData[empId]?.[dayIndex];
    if (!dayData) return;
    setDaySchedule(selectedWeek, empId, dayIndex, {
      ...dayData,
      blocks: dayData.blocks.filter((b) => b.id !== blockId),
    });
    setEditModal(null);
  }, [editModal, selectedWeek, weekData, setDaySchedule]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${printMode ? 'print-mode' : ''}`}
      style={{ backgroundColor: '#0f0f11', color: '#e8e8ee' }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ── Violation banner ─────────────────────────────────────── */}
        <ViolationBanner
          violations={violations}
          expanded={violExpanded}
          onToggle={() => setViolExpanded((v) => !v)}
        />

        {/* ── Top header bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">

          {/* Back button (day view only) */}
          {view === 'day' && (
            <button
              onClick={() => setView('week')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] mr-1"
              style={{ backgroundColor: '#2a2a32', color: '#e8e8ee' }}
            >
              <ChevronLeft size={16} />
              Week
            </button>
          )}

          {/* Week navigator */}
          <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid #2a2a32' }}>
            <button
              onClick={prevWeek}
              className="flex items-center justify-center px-3 min-h-[44px]"
              style={{ color: '#e8e8ee', backgroundColor: '#1a1a1f' }}
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 text-center select-none" style={{ backgroundColor: '#1a1a1f', minWidth: 180 }}>
              <div className="text-xs font-medium" style={{ color: '#e8e8ee' }}>{weekDateRange}</div>
              <div className="text-xs" style={{ color: '#f5c842' }}>{weekLabel}</div>
            </div>
            <button
              onClick={nextWeek}
              className="flex items-center justify-center px-3 min-h-[44px]"
              style={{ color: '#e8e8ee', backgroundColor: '#1a1a1f' }}
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day label (day view only) */}
          {view === 'day' && (
            <span className="text-sm font-semibold ml-1" style={{ color: '#f5c842' }}>
              {selectedDayLabel}
            </span>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
            style={{ backgroundColor: '#f5c842', color: '#0f0f11', opacity: generating ? 0.6 : 1 }}
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate'}
          </button>

          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px]"
            style={{ backgroundColor: '#2a2a32', color: '#e8e8ee', opacity: optimizing ? 0.6 : 1 }}
          >
            <Zap size={15} className={optimizing ? 'animate-pulse' : ''} />
            {optimizing ? 'Optimizing…' : 'Auto-Optimize'}
          </button>

          <button
            onClick={() => setPrintMode((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px]"
            style={{
              backgroundColor: printMode ? '#f5c842' : '#2a2a32',
              color: printMode ? '#0f0f11' : '#e8e8ee',
            }}
          >
            <Printer size={15} />
            {printMode ? 'Exit Print' : 'Print View'}
          </button>
        </div>

        {/* ── Main grid area ────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
        >
          {view === 'week' ? (
            <div className="p-4">
              <WeekOverview
                weekData={weekData}
                employees={employees}
                onCellClick={handleCellClick}
              />
            </div>
          ) : (
            <DayTimeline
              weekData={weekData}
              employees={employees}
              selectedWeek={selectedWeek}
              selectedDay={selectedDay}
              isMobile={isMobile}
              onEditBlock={handleEditBlock}
              setBlockInDay={setBlockInDay}
            />
          )}
        </div>

        {/* ── Day Shift Breakdown (day view only) ──────────────────── */}
        {view === 'day' && !printMode && (
          <DayShiftBreakdown
            weekData={Object.fromEntries(
              employees.map(emp => [emp.id, weekData[emp.id]?.[selectedDay]]),
            )}
            employees={employees}
          />
        )}

        {/* ── Legend ─────────────────────────────────────────────────── */}
        {!printMode && (
          <div className="mt-4 flex flex-wrap gap-2">
            {TASK_TYPES.filter((t) => t !== 'ApprovedOff').map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TASK_COLORS[t] }} />
                <span className="text-xs" style={{ color: '#6b7280' }}>{t}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={APPROVED_OFF_STYLE} />
              <span className="text-xs" style={{ color: '#6b7280' }}>Approved Off</span>
            </div>
          </div>
        )}

      </div>

      {/* ── Edit block modal ─────────────────────────────────────────── */}
      {editModal && (
        <EditBlockModal
          block={editModal.block}
          empId={editModal.empId}
          dayIndex={editModal.dayIndex}
          weekIndex={selectedWeek}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
