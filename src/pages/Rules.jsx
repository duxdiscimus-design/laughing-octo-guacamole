import { useState, useRef } from 'react';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit2, Trash2, GripVertical, Star } from 'lucide-react';
import { useRules } from '../hooks/useRules';
import { ENFORCEMENT_TYPES, RULE_CATEGORIES, TASK_TYPES, ROLES, DAYS_OF_WEEK } from '../constants';
import ruleLibrary from '../data/ruleLibrary.json';

/* ─── theme tokens ────────────────────────────────────────────────────────── */
const T = {
  bg:      'var(--color-bg)',
  surface: 'var(--color-surface)',
  accent:  'var(--color-accent)',
  primary: 'var(--color-text-primary)',
  muted:   'var(--color-text-muted)',
  border:  'var(--color-border)',
};
const TIER_COLORS = { High: '#ef4444', Medium: '#f97316', Low: '#22c55e' };
const CATEGORY_LETTER = {
  Leadership: 'A', ShiftStructure: 'B', Cashier: 'C',
  Meetings: 'D', Planning: 'E', Fairness: 'F', Labor: 'G',
};

/* ─── library grouped by category ─────────────────────────────────────────── */
const libraryByCategory = RULE_CATEGORIES
  .filter(c => c !== 'Custom')
  .reduce((acc, cat) => {
    acc[cat] = ruleLibrary.filter(r => r.category === cat);
    return acc;
  }, {});

/* ─── default builder state ────────────────────────────────────────────────── */
const DEFAULT_BUILDER = {
  name: '', category: 'Leadership', enforcementType: 'COVERAGE',
  parameters: {}, severity: 'SOFT',
};

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL SHARED ATOMS
═══════════════════════════════════════════════════════════════════════════ */
function Badge({ children, color = T.muted }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return <Badge color={severity === 'HARD' ? '#ef4444' : '#f97316'}>{severity}</Badge>;
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ width: 36, height: 20, backgroundColor: checked ? '#22c55e' : T.border }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform duration-200"
        style={{ width: 14, height: 14, transform: checked ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium mb-1" style={{ color: T.muted }}>{children}</label>
  );
}

function TextInput({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded px-2.5 py-1.5 text-sm focus:outline-none"
      style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.primary, ...props.style }}
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      {...props}
      className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
      style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.primary, ...props.style }}
    >
      {children}
    </select>
  );
}

function MultiChips({ options, value = [], onChange }) {
  const arr = Array.isArray(value) ? value : [];
  const toggle = (opt) =>
    arr.includes(opt) ? onChange(arr.filter(v => v !== opt)) : onChange([...arr, opt]);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: arr.includes(opt) ? T.accent : T.bg,
            color: arr.includes(opt) ? '#000' : T.muted,
            border: `1px solid ${arr.includes(opt) ? T.accent : T.border}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DYNAMIC PARAMETER FIELDS
═══════════════════════════════════════════════════════════════════════════ */
function normalizeRole(role) {
  if (!role) return [];
  if (Array.isArray(role)) return role;
  return role.split(',').map(r => r.trim()).filter(Boolean);
}

function normalizeLibraryParams(entry) {
  const p = { ...(entry.defaultParameters || {}) };
  if (entry.enforcementType === 'COVERAGE' && typeof p.role === 'string') {
    p.role = normalizeRole(p.role);
  }
  return p;
}

function ParameterFields({ enforcementType, params, setParam }) {
  const p = params || {};
  const set = (key, val) => setParam(key, val);

  switch (enforcementType) {
    case 'COVERAGE':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Roles</FieldLabel>
            <MultiChips
              options={['Any', ...ROLES]}
              value={normalizeRole(p.role)}
              onChange={v => set('role', v)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Min Count</FieldLabel>
              <TextInput type="number" min={1} value={p.minimumCount ?? ''} onChange={e => set('minimumCount', +e.target.value)} />
            </div>
            <div>
              <FieldLabel>Time Start</FieldLabel>
              <TextInput type="time" value={p.timeStart ?? ''} onChange={e => set('timeStart', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Time End</FieldLabel>
              <TextInput type="time" value={p.timeEnd ?? ''} onChange={e => set('timeEnd', e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel>Days</FieldLabel>
            <MultiChips options={DAYS_OF_WEEK} value={p.days ?? []} onChange={v => set('days', v)} />
          </div>
        </div>
      );

    case 'SHIFT_GAP':
      return (
        <div>
          <FieldLabel>Minimum Gap (hours)</FieldLabel>
          <TextInput type="number" min={0} step={0.5} value={p.minimumGapHours ?? ''} onChange={e => set('minimumGapHours', +e.target.value)} />
        </div>
      );

    case 'MAX_DAYS':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Max Days Per Week</FieldLabel>
            <TextInput type="number" min={1} max={7} value={p.maxDaysPerWeek ?? ''} onChange={e => set('maxDaysPerWeek', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Role Filter (optional)</FieldLabel>
            <MultiChips options={ROLES} value={p.roleFilter ?? []} onChange={v => set('roleFilter', v)} />
          </div>
        </div>
      );

    case 'CONSECUTIVE_DAYS_OFF':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Min Consecutive Days Off</FieldLabel>
            <TextInput type="number" min={1} value={p.minConsecutiveDaysOff ?? ''} onChange={e => set('minConsecutiveDaysOff', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Role Filter</FieldLabel>
            <MultiChips options={ROLES} value={p.roleFilter ?? []} onChange={v => set('roleFilter', v)} />
          </div>
        </div>
      );

    case 'NO_CLOPENING':
      return <p className="text-xs italic py-1" style={{ color: T.muted }}>Applies to all employees — no parameters needed.</p>;

    case 'MAX_CONSECUTIVE_DAYS':
      return (
        <div>
          <FieldLabel>Max Consecutive Days</FieldLabel>
          <TextInput type="number" min={1} value={p.maxConsecutiveDays ?? ''} onChange={e => set('maxConsecutiveDays', +e.target.value)} />
        </div>
      );

    case 'SHIFT_WINDOW':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Earliest Start (optional)</FieldLabel>
              <TextInput type="time" value={p.earliestStart ?? ''} onChange={e => set('earliestStart', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Latest End (optional)</FieldLabel>
              <TextInput type="time" value={p.latestEnd ?? ''} onChange={e => set('latestEnd', e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel>Task Type (optional)</FieldLabel>
            <SelectInput value={p.taskType ?? ''} onChange={e => set('taskType', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Any —</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </div>
        </div>
      );

    case 'SHIFT_LENGTH':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Role</FieldLabel>
            <SelectInput value={p.role ?? ''} onChange={e => set('role', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select role —</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Required Hours</FieldLabel>
            <TextInput type="number" min={0} step={0.5} value={p.requiredHours ?? ''} onChange={e => set('requiredHours', +e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.primary }}>
            <input type="checkbox" checked={p.lunchIncluded ?? false} onChange={e => set('lunchIncluded', e.target.checked)} />
            Lunch Included
          </label>
        </div>
      );

    case 'BLOCK_LIMIT':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Task Type</FieldLabel>
            <SelectInput value={p.taskType ?? ''} onChange={e => set('taskType', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select type —</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Max Hours (optional)</FieldLabel>
              <TextInput type="number" min={0} step={0.5} value={p.maxHours ?? ''} onChange={e => set('maxHours', +e.target.value)} />
            </div>
            <div>
              <FieldLabel>Min Hours (optional)</FieldLabel>
              <TextInput type="number" min={0} step={0.5} value={p.minHours ?? ''} onChange={e => set('minHours', +e.target.value)} />
            </div>
          </div>
        </div>
      );

    case 'LOD_AT_TIME':
      return (
        <div>
          <FieldLabel>Events</FieldLabel>
          <div className="flex flex-col gap-2 mt-1">
            {['store_open', 'store_close'].map(ev => (
              <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.primary }}>
                <input
                  type="checkbox"
                  checked={(p.events ?? []).includes(ev)}
                  onChange={e => {
                    const cur = p.events ?? [];
                    set('events', e.target.checked ? [...cur, ev] : cur.filter(x => x !== ev));
                  }}
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
      );

    case 'TASK_OVERLAP':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Task Name</FieldLabel>
            <TextInput value={p.taskName ?? ''} onChange={e => set('taskName', e.target.value)} placeholder="e.g. LOD" />
          </div>
          <div>
            <FieldLabel>Required Overlap</FieldLabel>
            <TextInput value={p.requiredOverlap ?? ''} onChange={e => set('requiredOverlap', e.target.value)} placeholder="e.g. 30min" />
          </div>
        </div>
      );

    case 'ROLE_ONLY':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Task Type</FieldLabel>
            <SelectInput value={p.taskType ?? ''} onChange={e => set('taskType', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select type —</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Allowed Roles</FieldLabel>
            <MultiChips options={ROLES} value={p.allowedRoles ?? []} onChange={v => set('allowedRoles', v)} />
          </div>
        </div>
      );

    case 'HOURS_TARGET':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Direction</FieldLabel>
            <SelectInput value={p.direction ?? ''} onChange={e => set('direction', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select —</option>
              <option value="over">Over</option>
              <option value="under">Under</option>
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Threshold (hours)</FieldLabel>
            <TextInput type="number" min={0} step={0.5} value={p.threshold ?? ''} onChange={e => set('threshold', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Role Filter (optional)</FieldLabel>
            <MultiChips options={ROLES} value={p.roleFilter ?? []} onChange={v => set('roleFilter', v)} />
          </div>
        </div>
      );

    case 'OVERTIME_FLAG':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Hour Cap</FieldLabel>
            <TextInput type="number" min={0} step={0.5} value={p.hourCap ?? ''} onChange={e => set('hourCap', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Role Filter</FieldLabel>
            <MultiChips options={ROLES} value={p.roleFilter ?? []} onChange={v => set('roleFilter', v)} />
          </div>
        </div>
      );

    case 'LABOR_BUDGET':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Threshold Type</FieldLabel>
            <SelectInput value={p.thresholdType ?? ''} onChange={e => set('thresholdType', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select —</option>
              <option value="hours">Hours</option>
              <option value="dollars">Dollars</option>
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Maximum Value</FieldLabel>
            <TextInput type="number" min={0} value={p.maximumValue ?? ''} onChange={e => set('maximumValue', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Alert Buffer (%)</FieldLabel>
            <TextInput type="number" min={0} max={100} value={p.alertBuffer ?? ''} onChange={e => set('alertBuffer', +e.target.value)} />
          </div>
        </div>
      );

    case 'ROTATION_FAIRNESS':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Shift Type</FieldLabel>
            <SelectInput value={p.shiftType ?? ''} onChange={e => set('shiftType', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select —</option>
              {['opening', 'closing', 'weekend', 'daysOff', 'fridaySaturdayNight'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Max Imbalance</FieldLabel>
            <TextInput type="number" min={0} value={p.maxImbalance ?? ''} onChange={e => set('maxImbalance', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Role Filter (optional)</FieldLabel>
            <MultiChips options={ROLES} value={p.roleFilter ?? []} onChange={v => set('roleFilter', v)} />
          </div>
        </div>
      );

    case 'PLANNING_HOURS':
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Role</FieldLabel>
            <SelectInput value={p.role ?? ''} onChange={e => set('role', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select role —</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Required Hours</FieldLabel>
            <TextInput type="number" min={0} step={0.5} value={p.requiredHours ?? ''} onChange={e => set('requiredHours', +e.target.value)} />
          </div>
          <div>
            <FieldLabel>Spread Days</FieldLabel>
            <TextInput type="number" min={1} max={7} value={p.spreadDays ?? ''} onChange={e => set('spreadDays', +e.target.value)} />
          </div>
        </div>
      );

    case 'CUSTOM_SOFT':
      return (
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="w-full rounded px-2.5 py-1.5 text-sm focus:outline-none resize-none"
            rows={3}
            style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.primary }}
            value={p.description ?? ''}
            onChange={e => set('description', e.target.value)}
          />
        </div>
      );

    default:
      return <p className="text-xs italic" style={{ color: T.muted }}>No parameters for this type.</p>;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RULE CARD (My Rules section)
═══════════════════════════════════════════════════════════════════════════ */
function RuleCard({ rule, onToggle, onEdit, onDelete, onSetTier, isEditing }) {
  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${rule.isOn ? '#22c55e' : T.border}`,
        outline: isEditing ? `1px solid ${T.accent}` : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Toggle checked={rule.isOn} onChange={onToggle} />
        </div>
        <div className="flex-1 min-w-0">
          {/* Row 1: name + severity */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-semibold" style={{ color: T.primary }}>{rule.name}</span>
            <SeverityBadge severity={rule.severity} />
          </div>
          {/* Row 2: type + category badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge>{rule.enforcementType}</Badge>
            <Badge color="#8b5cf6">{rule.category}</Badge>
          </div>
          {/* Description */}
          {rule.description && (
            <p className="text-xs mb-2 line-clamp-2" style={{ color: T.muted }}>{rule.description}</p>
          )}
          {/* Priority tier */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: T.muted }}>Priority Tier:</span>
            <div className="flex gap-1">
              {['High', 'Medium', 'Low'].map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onSetTier(tier)}
                  className="px-2 py-0.5 rounded text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: rule.priorityTier === tier ? `${TIER_COLORS[tier]}33` : T.bg,
                    color: rule.priorityTier === tier ? TIER_COLORS[tier] : T.muted,
                    border: `1px solid ${rule.priorityTier === tier ? TIER_COLORS[tier] : T.border}`,
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: isEditing ? `${T.accent}22` : T.bg,
                color: isEditing ? T.accent : T.muted,
                border: `1px solid ${isEditing ? T.accent : T.border}`,
              }}
            >
              <Edit2 size={11} />{isEditing ? 'Editing…' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{ backgroundColor: T.bg, color: '#ef4444', border: '1px solid #ef444444' }}
            >
              <Trash2 size={11} />Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-OPTIMIZE: SORTABLE ITEM
═══════════════════════════════════════════════════════════════════════════ */
function SortableRuleChip({ rule }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ color: T.muted, cursor: 'grab', display: 'flex', alignItems: 'center', touchAction: 'none' }}
      >
        <GripVertical size={13} />
      </span>
      <span className="text-xs flex-1 truncate" style={{ color: T.primary }}>{rule.name}</span>
      <Badge color="#6b7280">{rule.category}</Badge>
    </div>
  );
}

/* ─── droppable tier column ─────────────────────────────────────────────── */
function TierColumn({ tier, rules }) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier}` });
  const color = TIER_COLORS[tier];
  return (
    <div className="flex-1 min-w-0">
      <div
        className="text-xs font-bold mb-2 px-2 py-1 rounded text-center"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {tier} <span style={{ opacity: 0.7 }}>({rules.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className="min-h-16 rounded-lg p-2 transition-colors"
        style={{
          backgroundColor: isOver ? `${color}11` : T.bg,
          border: `1px dashed ${isOver ? color : T.border}`,
        }}
      >
        <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {rules.map(r => <SortableRuleChip key={r.id} rule={r} />)}
        </SortableContext>
        {rules.length === 0 && (
          <p className="text-center text-[10px] py-3" style={{ color: T.muted }}>Drop here</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIBRARY ENTRY CARD
═══════════════════════════════════════════════════════════════════════════ */
function LibraryCard({ entry, onAddToMyRules, onSaveAsTemplate, flashSaved }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: `${T.accent}22`, color: T.accent }}
        >
          {entry.code}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-medium" style={{ color: T.primary }}>{entry.name}</span>
            <SeverityBadge severity={entry.severity} />
            <Badge>{entry.enforcementType}</Badge>
          </div>
          {entry.description && (
            <p className="text-xs mb-2" style={{ color: T.muted }}>{entry.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddToMyRules}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{ backgroundColor: `${T.accent}22`, color: T.accent, border: `1px solid ${T.accent}44` }}
            >
              Add to My Rules
            </button>
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: flashSaved ? '#22c55e22' : T.bg,
                color: flashSaved ? '#22c55e' : T.muted,
                border: `1px solid ${flashSaved ? '#22c55e44' : T.border}`,
              }}
            >
              <Star size={10} />{flashSaved ? 'Saved!' : 'Save as Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function Rules() {
  const {
    rules, templates,
    addRule, updateRule, deleteRule, toggleRule, setTier,
    saveTemplate, deleteTemplate, activeCount,
  } = useRules();

  const [editingRule, setEditingRule]     = useState(null);
  const [builderData, setBuilderData]     = useState(DEFAULT_BUILDER);
  const [filterCategory, setFilterCat]   = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterSeverity, setFilterSev]   = useState('');
  const [confirmDelete, setConfirmDel]   = useState(null); // ruleId | { type:'template', id }
  const [templateFlash, setTplFlash]     = useState(null); // entry code
  const [dndActiveId, setDndActiveId]    = useState(null);
  const builderRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /* ── builder helpers ──────────────────────────────────────────────────── */
  const setParam = (key, val) =>
    setBuilderData(prev => ({ ...prev, parameters: { ...prev.parameters, [key]: val } }));

  const scrollToBuilder = () =>
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  const loadIntoBuilder = ({ name = '', category = 'Leadership', enforcementType = 'COVERAGE', parameters = {}, severity = 'SOFT' }) => {
    setEditingRule(null);
    setBuilderData({ name, category, enforcementType, parameters, severity });
    scrollToBuilder();
  };

  const handleSaveRule = () => {
    if (!builderData.name.trim()) return;
    if (editingRule) {
      updateRule(editingRule.id, {
        name: builderData.name,
        category: builderData.category,
        enforcementType: builderData.enforcementType,
        parameters: builderData.parameters,
        severity: builderData.severity,
      });
      setEditingRule(null);
    } else {
      addRule({ ...builderData });
    }
    setBuilderData(DEFAULT_BUILDER);
  };

  const handleSaveTemplate = () => {
    if (!builderData.name.trim()) return;
    saveTemplate({ ...builderData });
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setBuilderData({
      name: rule.name,
      category: rule.category,
      enforcementType: rule.enforcementType,
      parameters: rule.parameters || {},
      severity: rule.severity,
    });
    scrollToBuilder();
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setBuilderData(DEFAULT_BUILDER);
  };

  const handleAddToMyRules = (entry) => {
    loadIntoBuilder({
      name: entry.name,
      category: entry.category,
      enforcementType: entry.enforcementType,
      parameters: normalizeLibraryParams(entry),
      severity: entry.severity,
    });
  };

  const handleSaveAsTemplateFromLib = (entry) => {
    saveTemplate({
      name: entry.name,
      category: entry.category,
      enforcementType: entry.enforcementType,
      parameters: normalizeLibraryParams(entry),
      severity: entry.severity,
    });
    setTplFlash(entry.code);
    setTimeout(() => setTplFlash(null), 2000);
  };

  /* ── filtered rules ───────────────────────────────────────────────────── */
  const filteredRules = rules.filter(r => {
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterType && r.enforcementType !== filterType) return false;
    if (filterSeverity && r.severity !== filterSeverity) return false;
    return true;
  });

  /* ── DnD (Auto-Optimize panel) ─────────────────────────────────────────── */
  const onRules = rules.filter(r => r.isOn);
  const tierGroups = {
    High:   onRules.filter(r => r.priorityTier === 'High'),
    Medium: onRules.filter(r => r.priorityTier === 'Medium'),
    Low:    onRules.filter(r => r.priorityTier === 'Low'),
  };

  const handleDragStart = ({ active }) => setDndActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setDndActiveId(null);
    if (!over) return;
    const overId = String(over.id);
    // Dropped directly on a tier container
    const tierMatch = overId.match(/^tier-(High|Medium|Low)$/);
    const newTier = tierMatch
      ? tierMatch[1]
      : rules.find(r => r.id === over.id)?.priorityTier;
    if (newTier && rules.find(r => r.id === active.id)?.priorityTier !== newTier) {
      setTier(active.id, newTier);
    }
  };

  const dndActiveRule = dndActiveId ? rules.find(r => r.id === dndActiveId) : null;

  /* ── confirm delete ───────────────────────────────────────────────────── */
  const doDelete = () => {
    if (!confirmDelete) return;
    if (typeof confirmDelete === 'string') {
      deleteRule(confirmDelete);
      if (editingRule?.id === confirmDelete) handleCancelEdit();
    } else if (confirmDelete.type === 'template') {
      deleteTemplate(confirmDelete.id);
    }
    setConfirmDel(null);
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-16">

      {/* ══ SECTION 1 — MY RULES ══════════════════════════════════════════ */}
      <section>
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold" style={{ color: T.primary }}>My Rules</h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: activeCount > 0 ? '#22c55e22' : T.border,
                color: activeCount > 0 ? '#22c55e' : T.muted,
              }}
            >
              {activeCount} active
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setEditingRule(null); setBuilderData(DEFAULT_BUILDER); scrollToBuilder(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: T.accent, color: '#000' }}
          >
            <Plus size={14} />Add New Rule
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <SelectInput value={filterCategory} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {RULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
          <SelectInput value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {ENFORCEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
          <SelectInput value={filterSeverity} onChange={e => setFilterSev(e.target.value)}>
            <option value="">All Severities</option>
            <option value="HARD">HARD</option>
            <option value="SOFT">SOFT</option>
          </SelectInput>
        </div>

        {/* Rule cards */}
        {filteredRules.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            <p className="text-sm" style={{ color: T.muted }}>
              {rules.length === 0
                ? 'No rules yet. Add one from the Rule Builder or Reference Library below.'
                : 'No rules match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => handleEditRule(rule)}
                onDelete={() => setConfirmDel(rule.id)}
                onSetTier={(tier) => setTier(rule.id, tier)}
                isEditing={editingRule?.id === rule.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══ AUTO-OPTIMIZE PRIORITY TIER PANEL ════════════════════════════ */}
      {activeCount > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="text-base font-bold" style={{ color: T.primary }}>Auto-Optimize Priority Tiers</h3>
            <p className="text-xs mt-0.5" style={{ color: T.muted }}>
              Drag active rules between tiers to adjust enforcement priority
            </p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-3">
                {['High', 'Medium', 'Low'].map(tier => (
                  <TierColumn key={tier} tier={tier} rules={tierGroups[tier]} />
                ))}
              </div>
              <DragOverlay>
                {dndActiveRule && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs font-medium shadow-xl"
                    style={{ backgroundColor: T.surface, border: `1px solid ${T.accent}`, color: T.primary }}
                  >
                    {dndActiveRule.name}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </section>
      )}

      {/* ══ SECTION 2 — RULE BUILDER ══════════════════════════════════════ */}
      <section ref={builderRef}>
        <h2 className="text-lg font-bold mb-4" style={{ color: T.primary }}>
          {editingRule ? `Editing: ${editingRule.name}` : 'Rule Builder'}
        </h2>
        <div
          className="rounded-xl p-5 space-y-5"
          style={{
            backgroundColor: T.surface,
            border: `1px solid ${editingRule ? T.accent : T.border}`,
          }}
        >
          {/* Name */}
          <div>
            <FieldLabel>Rule Name *</FieldLabel>
            <TextInput
              value={builderData.name}
              onChange={e => setBuilderData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. 2 Leaders on Morning Shift"
              style={{ width: '100%' }}
            />
          </div>

          {/* Category + Enforcement Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Category</FieldLabel>
              <SelectInput
                value={builderData.category}
                onChange={e => setBuilderData(prev => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%' }}
              >
                {RULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Enforcement Type</FieldLabel>
              <SelectInput
                value={builderData.enforcementType}
                onChange={e => setBuilderData(prev => ({
                  ...prev,
                  enforcementType: e.target.value,
                  parameters: {},
                }))}
                style={{ width: '100%' }}
              >
                {ENFORCEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </SelectInput>
            </div>
          </div>

          {/* Dynamic parameters */}
          <div>
            <FieldLabel>Parameters</FieldLabel>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
            >
              <ParameterFields
                enforcementType={builderData.enforcementType}
                params={builderData.parameters}
                setParam={setParam}
              />
            </div>
          </div>

          {/* Severity toggle */}
          <div>
            <FieldLabel>Severity</FieldLabel>
            <div className="flex gap-2">
              {['SOFT', 'HARD'].map(sev => {
                const activeColor = sev === 'HARD' ? '#ef4444' : '#f97316';
                const isActive = builderData.severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setBuilderData(prev => ({ ...prev, severity: sev }))}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                    style={{
                      backgroundColor: isActive ? `${activeColor}22` : T.bg,
                      color: isActive ? activeColor : T.muted,
                      border: `1px solid ${isActive ? activeColor : T.border}`,
                    }}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1 border-t" style={{ borderColor: T.border }}>
            {editingRule ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  disabled={!builderData.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: T.accent, color: '#000' }}
                >
                  Update Rule
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: T.bg, color: T.muted, border: `1px solid ${T.border}` }}
                >
                  Cancel Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  disabled={!builderData.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: T.accent, color: '#000' }}
                >
                  Save to My Rules
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!builderData.name.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: T.bg, color: T.primary, border: `1px solid ${T.border}` }}
                >
                  <Star size={13} />Save as Template
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══ SECTION 3 — REFERENCE LIBRARY ════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: T.primary }}>Reference Library</h2>
        <div className="space-y-6">
          {Object.entries(libraryByCategory)
            .filter(([, entries]) => entries.length > 0)
            .map(([category, entries]) => (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: T.accent }}>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: `${T.accent}22`, color: T.accent }}
                  >
                    {CATEGORY_LETTER[category] ?? '?'}
                  </span>
                  {category}
                </h3>
                <div className="space-y-2">
                  {entries.map(entry => (
                    <LibraryCard
                      key={entry.code}
                      entry={entry}
                      onAddToMyRules={() => handleAddToMyRules(entry)}
                      onSaveAsTemplate={() => handleSaveAsTemplateFromLib(entry)}
                      flashSaved={templateFlash === entry.code}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ══ PERSONAL SAVED TEMPLATES ══════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: T.primary }}>
          Personal Saved Templates
          <span className="ml-2 text-sm font-normal" style={{ color: T.muted }}>({templates.length})</span>
        </h2>
        {templates.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            <p className="text-sm" style={{ color: T.muted }}>
              No saved templates yet. Use "Save as Template" in the builder or library.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="rounded-lg p-3 flex flex-wrap items-center gap-3"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
              >
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: T.primary }}>{tpl.name}</span>
                  <SeverityBadge severity={tpl.severity} />
                  <Badge>{tpl.enforcementType}</Badge>
                  <Badge color="#8b5cf6">{tpl.category}</Badge>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadIntoBuilder({
                      name: tpl.name,
                      category: tpl.category,
                      enforcementType: tpl.enforcementType,
                      parameters: tpl.parameters || {},
                      severity: tpl.severity,
                    })}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: `${T.accent}22`, color: T.accent, border: `1px solid ${T.accent}44` }}
                  >
                    Add to My Rules
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel({ type: 'template', id: tpl.id })}
                    className="p-1.5 rounded transition-opacity hover:opacity-80"
                    style={{ color: '#ef4444', border: '1px solid #ef444433', backgroundColor: T.bg }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══ DELETE CONFIRMATION MODAL ══════════════════════════════════════ */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setConfirmDel(null)}
        >
          <div
            className="rounded-xl p-6 max-w-sm w-full shadow-2xl"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-2" style={{ color: T.primary }}>Confirm Delete</h3>
            <p className="text-sm mb-5" style={{ color: T.muted }}>
              Are you sure you want to delete this {typeof confirmDelete === 'string' ? 'rule' : 'template'}?
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: T.bg, color: T.muted, border: `1px solid ${T.border}` }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
