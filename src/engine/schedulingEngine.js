// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Store open/close times in minutes from midnight
const STORE_HOURS = {
  // Mon–Sat (dayIndex 0–5)
  weekday: { open: 7 * 60 + 30, close: 20 * 60 + 30 }, // 7:30–20:30
  // Sun (dayIndex 6)
  sunday: { open: 8 * 60 + 30, close: 18 * 60 + 30 },  // 8:30–18:30
};

// ─── Tiny UUID shim (avoids external dep at engine level) ────────────────────

let _counter = 0;
function makeId() {
  _counter = (_counter + 1) % 1e9;
  return `blk_${Date.now()}_${_counter}`;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function storeHours(dayIndex) {
  return dayIndex === 6 ? STORE_HOURS.sunday : STORE_HOURS.weekday;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Get ISO date string for a specific day in the rotation.
 * weekIndex 0-3, dayIndex 0=Mon … 6=Sun
 */
export function getDateForDay(rotationStartDate, weekIndex, dayIndex) {
  const start = new Date(rotationStartDate);
  const dayOffset = weekIndex * 7 + dayIndex;
  const d = new Date(start);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Check if an employee is available on a given date string.
 */
export function isAvailable(employeeId, dateStr, availability) {
  const avail = availability[employeeId];
  if (!avail) return true;

  // Check dateBlocks
  for (const block of avail.dateBlocks || []) {
    if (dateStr >= block.start && dateStr <= block.end) return false;
  }

  // Check recurring availability
  const jsDay = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun … 6=Sat
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (avail.recurring && avail.recurring[dayNames[jsDay]] === false) return false;

  return true;
}

// ─── Block builder ────────────────────────────────────────────────────────────

function makeBlock(type, startMin, endMin) {
  return {
    id: makeId(),
    type,
    startTime: minutesToTime(startMin),
    endTime: minutesToTime(endMin),
    durationHours: (endMin - startMin) / 60,
  };
}

// ─── Day slot helpers ─────────────────────────────────────────────────────────

/** Return sorted list of {start, end} gaps NOT covered by existing blocks */
function getFreeSlots(blocks, windowStart, windowEnd) {
  if (windowStart >= windowEnd) return [];

  const occupied = blocks
    .map(b => ({ s: timeToMinutes(b.startTime), e: timeToMinutes(b.endTime) }))
    .filter(r => r.s < windowEnd && r.e > windowStart)
    .sort((a, b) => a.s - b.s);

  const gaps = [];
  let cursor = windowStart;
  for (const seg of occupied) {
    if (seg.s > cursor) gaps.push({ start: cursor, end: seg.s });
    cursor = Math.max(cursor, seg.e);
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });
  return gaps;
}

/** Insert a block into an employee-day, maintaining sorted order */
function insertBlock(dayData, block) {
  dayData.blocks.push(block);
  dayData.blocks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** Total scheduled minutes (excluding Lunch and ApprovedOff) */
function totalWorkMinutes(blocks) {
  return blocks
    .filter(b => b.type !== 'Lunch' && b.type !== 'ApprovedOff')
    .reduce((sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)), 0);
}

/** Total minutes of a specific block type */
function totalTypeMinutes(blocks, type) {
  return blocks
    .filter(b => b.type === type)
    .reduce((sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)), 0);
}

// ─── Initialise / clone a week's schedule ────────────────────────────────────

function initDayData() {
  return {
    startTime: null,
    endTime: null,
    totalHours: 0,
    blocks: [],
    isOff: false,
    isApprovedOff: false,
    isManualOverride: false,
  };
}

function initWeekForEmployee(employeeId, existing) {
  const result = {};
  for (let d = 0; d < 7; d++) {
    const ex = existing?.[employeeId]?.[d];
    result[d] = ex ? JSON.parse(JSON.stringify(ex)) : initDayData();
  }
  return result;
}

/** Recompute startTime / endTime / totalHours from blocks */
function recomputeDayBounds(dayData) {
  const work = dayData.blocks.filter(b => b.type !== 'ApprovedOff');
  if (!work.length || dayData.isOff) {
    dayData.startTime = null;
    dayData.endTime = null;
    dayData.totalHours = 0;
    return;
  }
  const starts = work.map(b => timeToMinutes(b.startTime));
  const ends = work.map(b => timeToMinutes(b.endTime));
  const s = Math.min(...starts);
  const e = Math.max(...ends);
  dayData.startTime = minutesToTime(s);
  dayData.endTime = minutesToTime(e);
  dayData.totalHours = (e - s) / 60;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

function byRole(employees, ...roles) {
  return employees.filter(e => roles.includes(e.role));
}

function sortByRolePriority(emps) {
  const order = { SM: 0, AM: 1, SUP: 2, FTC: 3, PT: 4 };
  return [...emps].sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
}

// ─── Rule helpers ─────────────────────────────────────────────────────────────

function isRuleOn(activeRules, enforcementType) {
  if (!activeRules) return false;
  // Support both 'enforcementType' (standard) and legacy 'enforcement' field
  return activeRules.some(r =>
    (r.enforcementType === enforcementType || r.enforcement === enforcementType) &&
    r.enabled !== false,
  );
}

function getRuleParam(activeRules, enforcementType, param, fallback) {
  const rule = (activeRules || []).find(r =>
    (r.enforcementType === enforcementType || r.enforcement === enforcementType) &&
    r.enabled !== false,
  );
  // Support both 'parameters' (standard) and legacy 'params' field
  return rule?.parameters?.[param] ?? rule?.params?.[param] ?? fallback;
}

// ─── Main generateSchedule ────────────────────────────────────────────────────

/**
 * Generate a week schedule.
 *
 * @param {object[]} employees
 * @param {object}   availability   – { [empId]: { recurring, dateBlocks, fullWeeks } }
 * @param {object[]} activeRules
 * @param {object}   rotation       – { startDate: 'YYYY-MM-DD', currentWeek: number }
 * @param {object}   existingSchedule – scheduleData[weekIndex] (may be partial)
 * @param {number}   weekIndex      – 0–3
 * @returns {object} weekSchedule   – { [empId]: { [dayIndex]: dayData } }
 */
export function generateSchedule(
  employees,
  availability,
  activeRules,
  rotation,
  existingSchedule,
  weekIndex,
) {
  if (!employees || !employees.length) return {};

  const rotationStart = rotation?.startDate ?? new Date().toISOString().split('T')[0];

  // Build mutable week object – preserve manual overrides
  const week = {};
  for (const emp of employees) {
    week[emp.id] = initWeekForEmployee(emp.id, existingSchedule);
  }

  // ─── STEP 0A: Block approved unavailability ───────────────────────────────
  for (const emp of employees) {
    const avail = availability[emp.id] || {};
    const fullWeeks = avail.fullWeeks || [];
    const isFullWeekBlocked = fullWeeks.includes(weekIndex);

    for (let d = 0; d < 7; d++) {
      const dayData = week[emp.id][d];
      if (dayData.isManualOverride) continue;

      const dateStr = getDateForDay(rotationStart, weekIndex, d);
      const dayAvailable = !isFullWeekBlocked && isAvailable(emp.id, dateStr, availability);

      if (!dayAvailable) {
        dayData.isOff = true;
        dayData.isApprovedOff = true;
        dayData.blocks = [makeBlock('ApprovedOff', storeHours(d).open, storeHours(d).close)];
      }
    }
  }

  // ─── STEP 0B: Assign scheduled days off based on target hours ─────────────
  //
  // Without this, every employee gets scheduled 7 days/week. We calculate
  // how many days each person should work from their targetHours / shiftLength
  // and mark remaining days as off (isOff = true, no ApprovedOff block).
  //
  // Off-day patterns are staggered by employee index to ensure store coverage
  // on every day of the week.
  //
  // Leadership (SM/AM): always covers at least 1 leader per day.
  // PT associates: work only 2-3 days per week.
  //
  {
    // Off-day pattern pools — indices 0=Mon … 6=Sun
    // Leadership: prefer weekday pairs so Sat+Sun always has coverage
    const SM_AM_PATTERNS    = [[0,1],[1,2],[2,3],[3,4],[0,4],[1,3],[2,4]];
    // Supervisors / FTC: mix of weekday and weekend days off
    const SUP_FTC_PATTERNS  = [[0,1],[2,3],[4,5],[5,6],[0,6],[1,5],[2,6],[3,6],[0,5]];
    // PT: mostly off, work 2-4 days
    const PT_3DAY_PATTERNS  = [[0,1,2,3],[1,2,3,4],[2,3,4,5],[3,4,5,6],[0,1,5,6],[0,2,4,6],[1,3,5,6]];
    const PT_2DAY_PATTERNS  = [[0,1,2,3,4],[1,2,3,4,5],[2,3,4,5,6],[0,1,2,5,6],[0,1,3,4,6]];

    for (let ei = 0; ei < employees.length; ei++) {
      const emp = employees[ei];

      // How many days should this employee work?
      const shiftLen   = emp.shiftLength || (emp.role === 'PT' ? 5 : 8);
      const targetHrs  = emp.targetHours || (emp.role === 'PT' ? 12 : 40);
      let workDays     = Math.round(targetHrs / shiftLen);

      // Role-based hard limits
      if (emp.role === 'SM')  workDays = Math.min(workDays, 5);
      if (emp.role === 'AM')  workDays = Math.min(workDays, 5);
      if (emp.role === 'SUP') workDays = Math.min(workDays, 6);
      if (emp.role === 'FTC') workDays = Math.min(workDays, 6);
      if (emp.role === 'PT')  workDays = Math.max(1, Math.min(4, workDays));
      workDays = Math.max(1, Math.min(6, workDays));

      const daysOff = 7 - workDays;
      if (daysOff <= 0) continue;

      // Pick the off-day pattern for this employee
      let offDays;
      if (emp.role === 'SM' || emp.role === 'AM') {
        const pattern = SM_AM_PATTERNS[ei % SM_AM_PATTERNS.length];
        offDays = new Set(pattern.slice(0, daysOff));
      } else if (emp.role === 'SUP' || emp.role === 'FTC') {
        const pattern = SUP_FTC_PATTERNS[ei % SUP_FTC_PATTERNS.length];
        offDays = new Set(pattern.slice(0, daysOff));
      } else {
        // PT
        const pool = workDays <= 2 ? PT_2DAY_PATTERNS : PT_3DAY_PATTERNS;
        offDays = new Set(pool[ei % pool.length].slice(0, daysOff));
      }

      for (const d of offDays) {
        const dayData = week[emp.id]?.[d];
        if (!dayData || dayData.isManualOverride || dayData.isApprovedOff) continue;
        dayData.isOff = true;
        dayData.blocks = [];
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Helpers used throughout
  const isWorking = (empId, d) =>
    !week[empId]?.[d]?.isOff && !week[empId]?.[d]?.isApprovedOff;

  const empBlocks = (empId, d) => week[empId]?.[d]?.blocks ?? [];

  const addBlock = (empId, d, block) => {
    if (!isWorking(empId, d)) return false;
    const blocks = week[empId][d].blocks;
    // Verify no overlap
    const bs = timeToMinutes(block.startTime);
    const be = timeToMinutes(block.endTime);
    for (const b of blocks) {
      const xs = timeToMinutes(b.startTime);
      const xe = timeToMinutes(b.endTime);
      if (bs < xe && be > xs) return false; // overlap
    }
    insertBlock(week[empId][d], block);
    return true;
  };

  const workingDays = (empId) =>
    [0, 1, 2, 3, 4, 5, 6].filter(d => isWorking(empId, d));

  // ─── Determine each employee's working window ─────────────────────────────
  // We respect shiftLength; stagger start times per role + per-employee offset
  // so multiple employees of the same role don't all arrive at the same time.
  const empShiftWindow = {}; // empId -> { [dayIndex]: { start, end } }
  for (let ei = 0; ei < employees.length; ei++) {
    const emp = employees[ei];
    empShiftWindow[emp.id] = {};
    const shiftMins  = (emp.shiftLength || 8) * 60;

    // Per-role base offset from store open
    const roleOffset = emp.role === 'SM'  ?   0 :
                       emp.role === 'AM'  ?  30 :
                       emp.role === 'SUP' ?  30 :
                       emp.role === 'FTC' ?  60 :
                       /* PT */             120;

    // Per-employee additional offset (0 or 30 min) to create variety
    // e.g. PT associate 1 → 2:00h after open, PT associate 2 → 2:30h after open
    const roleGroup = employees.filter(e => e.role === emp.role);
    const posInGroup = roleGroup.indexOf(emp);
    const extraOffset = (posInGroup % 2) * 30;

    for (let d = 0; d < 7; d++) {
      if (!isWorking(emp.id, d)) continue;
      const { open, close } = storeHours(d);
      const shiftStart = Math.min(open + roleOffset + extraOffset, close - shiftMins);
      const shiftEnd   = Math.min(shiftStart + shiftMins, close);
      empShiftWindow[emp.id][d] = { start: shiftStart, end: shiftEnd };
    }
  }

  // ─── STEP 2: Assign Cash Office blocks ───────────────────────────────────
  const leaders = sortByRolePriority(byRole(employees, 'SM', 'AM', 'SUP'));
  for (let d = 0; d < 7; d++) {
    const { open } = storeHours(d);
    const coEnd = open + 30; // 30-min cash office at store open
    let assigned = false;
    for (const emp of leaders) {
      if (!isWorking(emp.id, d)) continue;
      const block = makeBlock('CashOffice', open, coEnd);
      if (addBlock(emp.id, d, block)) { assigned = true; break; }
    }
    // If no leader available, cash office is skipped for this day
  }

  // ─── STEP 3: Assign LOD blocks ────────────────────────────────────────────
  //
  // LOD must cover store open → close every day.
  // SM gets ~17 hrs LOD / week; AMs & SUPs fill the rest.
  // Max continuous LOD per person: 3 hrs (respects BLOCK_LIMIT rule).
  //
  const blockLimitOn = isRuleOn(activeRules, 'BLOCK_LIMIT');
  const maxContLOD = blockLimitOn
    ? (getRuleParam(activeRules, 'BLOCK_LIMIT', 'maxHours', 3) * 60)
    : 3 * 60; // default 3 hrs

  const smList = byRole(employees, 'SM');
  const amList = byRole(employees, 'AM');
  const supList = byRole(employees, 'SUP');
  const lodPool = sortByRolePriority([...smList, ...amList, ...supList]);

  // Track LOD minutes per employee across the week
  const lodMinutes = {}; // empId -> total LOD mins this week
  for (const emp of lodPool) lodMinutes[emp.id] = 0;

  // SM target: ~17 hrs = 1020 mins LOD/week
  const SM_LOD_TARGET = 17 * 60;

  for (let d = 0; d < 7; d++) {
    const { open, close } = storeHours(d);
    let cursor = open;

    // Build ordered list: SM first (if under target), then AM/SUP
    const available = lodPool.filter(e => isWorking(e.id, d));
    if (!available.length) continue;

    while (cursor < close) {
      // Pick best candidate: SM if under target, else rotate by least LOD today
      let candidate = null;
      for (const emp of available) {
        const isSM = emp.role === 'SM';
        const smUnderTarget =
          isSM && (lodMinutes[emp.id] || 0) < SM_LOD_TARGET;
        if (smUnderTarget && !candidate) {
          candidate = emp;
        } else if (!candidate) {
          candidate = emp;
        } else {
          // Prefer employee with fewer total LOD mins
          if ((lodMinutes[emp.id] || 0) < (lodMinutes[candidate.id] || 0)) {
            candidate = emp;
          }
        }
      }
      if (!candidate) break;

      // Find free slot starting at cursor
      const currentBlocks = empBlocks(candidate.id, d);
      const slots = getFreeSlots(currentBlocks, cursor, close);
      if (!slots.length) {
        // No free slot for this candidate – try next
        const idx = available.indexOf(candidate);
        available.splice(idx, 1);
        if (!available.length) break;
        continue;
      }

      const slot = slots[0];
      const slotStart = slot.start;
      const maxEnd = Math.min(slotStart + maxContLOD, slot.end, close);
      if (maxEnd <= slotStart) { cursor = slot.end; continue; }

      const block = makeBlock('LOD', slotStart, maxEnd);
      if (addBlock(candidate.id, d, block)) {
        lodMinutes[candidate.id] = (lodMinutes[candidate.id] || 0) + (maxEnd - slotStart);
        cursor = maxEnd;
      } else {
        cursor = slot.end;
      }
    }
  }

  // ─── STEP 4: Assign Cashier blocks ────────────────────────────────────────
  //
  // Target: ≥1 cashier during all store hours.
  // Priority: FTC → PT → any available.
  //
  const cashierPool = sortByRolePriority([
    ...byRole(employees, 'FTC'),
    ...byRole(employees, 'PT'),
    ...byRole(employees, 'SM', 'AM', 'SUP'),
  ]);

  for (let d = 0; d < 7; d++) {
    const { open, close } = storeHours(d);
    let cursor = open;

    while (cursor < close) {
      // Check if already covered
      const uncovered = cashierPool.filter(e => {
        if (!isWorking(e.id, d)) return false;
        const blocks = empBlocks(e.id, d);
        return blocks.some(
          b => b.type === 'Cashier' &&
               timeToMinutes(b.startTime) <= cursor &&
               timeToMinutes(b.endTime) > cursor,
        );
      });
      if (uncovered.length) { cursor += 30; continue; }

      // Find best cashier candidate with a free slot at cursor
      let assigned = false;
      for (const emp of cashierPool) {
        if (!isWorking(emp.id, d)) continue;
        const blocks = empBlocks(emp.id, d);
        const slots = getFreeSlots(blocks, cursor, close);
        if (!slots.length || slots[0].start > cursor) continue;
        const slot = slots[0];
        // Assign up to 4 hours or end of free slot
        const cashEnd = Math.min(slot.start + 4 * 60, slot.end, close);
        if (cashEnd <= slot.start) continue;
        const block = makeBlock('Cashier', slot.start, cashEnd);
        if (addBlock(emp.id, d, block)) { cursor = cashEnd; assigned = true; break; }
      }
      if (!assigned) cursor += 30; // advance to avoid infinite loop
    }
  }

  // ─── STEP 5: Assign SM Planning blocks (~20 hrs/week) ─────────────────────
  const SM_PLANNING_TARGET = 20 * 60; // 1200 mins

  for (const emp of smList) {
    let planningLeft = SM_PLANNING_TARGET;
    const wDays = workingDays(emp.id);
    if (!wDays.length) continue;

    // Spread ~4-5 hrs per working day on 3+ days
    const daysForPlanning = wDays.slice(0, Math.max(3, wDays.length));
    const perDay = Math.ceil(planningLeft / daysForPlanning.length);

    for (const d of daysForPlanning) {
      if (planningLeft <= 0) break;
      const sw = empShiftWindow[emp.id]?.[d];
      const winStart = sw ? sw.start : storeHours(d).open;
      const winEnd   = sw ? (sw.end - 60) : (storeHours(d).close - 60); // not last hour
      const blocks = empBlocks(emp.id, d);
      const slots = getFreeSlots(blocks, winStart, winEnd);
      let toAssign = Math.min(perDay, planningLeft);

      for (const slot of slots) {
        if (toAssign <= 0) break;
        const duration = Math.min(toAssign, slot.end - slot.start);
        if (duration <= 0) continue;
        const block = makeBlock('Planning', slot.start, slot.start + duration);
        if (addBlock(emp.id, d, block)) {
          planningLeft -= duration;
          toAssign -= duration;
        }
      }
    }
  }

  // ─── STEP 6: Assign AM/SUP Planning blocks ────────────────────────────────
  const PLANNING_TARGETS = { AM: 6 * 60, SUP: 3 * 60 }; // mins/week

  for (const emp of [...amList, ...supList]) {
    const target = PLANNING_TARGETS[emp.role] || 3 * 60;
    let planningLeft = target;
    const wDays = workingDays(emp.id);
    if (!wDays.length) continue;

    const perDay = Math.ceil(planningLeft / wDays.length);

    for (const d of wDays) {
      if (planningLeft <= 0) break;
      const sw = empShiftWindow[emp.id]?.[d];
      const winStart = sw ? sw.start : storeHours(d).open;
      const winEnd   = sw ? (sw.end - 60) : (storeHours(d).close - 60);
      const blocks = empBlocks(emp.id, d);
      const slots = getFreeSlots(blocks, winStart, winEnd);
      let toAssign = Math.min(perDay, planningLeft);

      for (const slot of slots) {
        if (toAssign <= 0) break;
        const duration = Math.min(toAssign, slot.end - slot.start);
        if (duration <= 0) continue;
        const block = makeBlock('Planning', slot.start, slot.start + duration);
        if (addBlock(emp.id, d, block)) {
          planningLeft -= duration;
          toAssign -= duration;
        }
      }
    }
  }

  // ─── STEP 7: Assign SM general tasking (~8 hrs Floor) ─────────────────────
  const SM_FLOOR_TARGET = 8 * 60;

  for (const emp of smList) {
    let floorLeft = SM_FLOOR_TARGET;
    const wDays = workingDays(emp.id);
    if (!wDays.length) continue;
    const perDay = Math.ceil(floorLeft / wDays.length);

    for (const d of wDays) {
      if (floorLeft <= 0) break;
      const sw = empShiftWindow[emp.id]?.[d];
      const winStart = sw ? sw.start : storeHours(d).open;
      const winEnd   = sw ? sw.end : storeHours(d).close;
      const blocks = empBlocks(emp.id, d);
      const slots = getFreeSlots(blocks, winStart, winEnd);
      let toAssign = Math.min(perDay, floorLeft);

      for (const slot of slots) {
        if (toAssign <= 0) break;
        const duration = Math.min(toAssign, slot.end - slot.start);
        if (duration <= 0) continue;
        const block = makeBlock('Floor', slot.start, slot.start + duration);
        if (addBlock(emp.id, d, block)) {
          floorLeft -= duration;
          toAssign -= duration;
        }
      }
    }
  }

  // ─── STEP 8: Conference Call (Monday 14:00–16:00) ─────────────────────────
  const CONF_CALL_START = 14 * 60; // 2:00 PM
  const CONF_CALL_END = 16 * 60;   // 4:00 PM
  const mondayIndex = 0;

  const confCallCandidates = sortByRolePriority(byRole(employees, 'SM', 'AM'));
  for (const emp of confCallCandidates) {
    if (!isWorking(emp.id, mondayIndex)) continue;
    const block = makeBlock('ConfCall', CONF_CALL_START, CONF_CALL_END);
    addBlock(emp.id, mondayIndex, block);
  }

  // ─── STEP 9: Fill remaining time with Floor blocks (within shift window) ────
  for (const emp of employees) {
    for (let d = 0; d < 7; d++) {
      if (!isWorking(emp.id, d)) continue;
      // Use the employee's personal shift window, not the full store hours
      const sw = empShiftWindow[emp.id]?.[d];
      if (!sw) continue;
      const blocks = empBlocks(emp.id, d);
      const slots = getFreeSlots(blocks, sw.start, sw.end);
      for (const slot of slots) {
        if (slot.end - slot.start < 15) continue; // ignore tiny gaps
        const block = makeBlock('Floor', slot.start, slot.end);
        addBlock(emp.id, d, block);
      }
    }
  }

  // ─── STEP 10: Add Lunch blocks ────────────────────────────────────────────
  //
  // SM: 1-hr Lunch; AM/SUP/FTC: 30-min Lunch; PT: no lunch.
  // Insert roughly in the middle of the shift (or after first 2 hrs of work).
  //
  for (const emp of employees) {
    if (emp.role === 'PT') continue;
    const lunchDuration = emp.role === 'SM'
      ? 60
      : (emp.lunchMinutes || 30);

    for (let d = 0; d < 7; d++) {
      if (!isWorking(emp.id, d)) continue;
      const blocks = empBlocks(emp.id, d);
      // Already has a lunch?
      if (blocks.some(b => b.type === 'Lunch')) continue;

      const { open, close } = storeHours(d);

      // Find the midpoint of the shift window for this employee
      const sw = empShiftWindow[emp.id]?.[d];
      const windowStart = sw ? sw.start : open;
      const windowEnd = sw ? sw.end : close;
      const midPoint = Math.floor((windowStart + windowEnd) / 2);

      // Find a free slot around midpoint
      const allSlots = getFreeSlots(blocks, windowStart, windowEnd);
      let lunchPlaced = false;
      for (const slot of allSlots) {
        const lsStart = Math.max(slot.start, midPoint - 30);
        const lsEnd = lsStart + lunchDuration;
        if (lsEnd > slot.end || lsStart < slot.start) {
          // Try fitting at start of slot
          if (slot.end - slot.start >= lunchDuration) {
            const block = makeBlock('Lunch', slot.start, slot.start + lunchDuration);
            if (addBlock(emp.id, d, block)) { lunchPlaced = true; break; }
          }
          continue;
        }
        const block = makeBlock('Lunch', lsStart, lsEnd);
        if (addBlock(emp.id, d, block)) { lunchPlaced = true; break; }
      }
    }
  }

  // ─── Finalise: recompute bounds for every day ─────────────────────────────
  for (const emp of employees) {
    for (let d = 0; d < 7; d++) {
      const dayData = week[emp.id][d];
      recomputeDayBounds(dayData);
    }
  }

  return week;
}

export default generateSchedule;
