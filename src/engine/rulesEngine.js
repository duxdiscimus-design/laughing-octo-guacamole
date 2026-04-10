// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Return all weeks present in scheduleData (0-3) */
function getWeeks(scheduleData) {
  return Object.keys(scheduleData).map(Number);
}

/** Get all (empId, weekIndex, dayIndex, block) tuples from scheduleData */
function allBlocks(scheduleData) {
  const results = [];
  for (const [weekStr, weekData] of Object.entries(scheduleData)) {
    const weekIndex = Number(weekStr);
    for (const [empId, empWeek] of Object.entries(weekData)) {
      for (const [dayStr, dayData] of Object.entries(empWeek)) {
        const dayIndex = Number(dayStr);
        for (const block of (dayData?.blocks ?? [])) {
          results.push({ weekIndex, empId, dayIndex, block });
        }
      }
    }
  }
  return results;
}

/** Return blocks for a specific employee on a specific week+day */
function empDayBlocks(scheduleData, empId, weekIndex, dayIndex) {
  return scheduleData?.[weekIndex]?.[empId]?.[dayIndex]?.blocks ?? [];
}

/** Returns the earliest start and latest end minutes for an employee on a given day */
function empDayBounds(blocks) {
  if (!blocks.length) return null;
  const starts = blocks.map(b => timeToMinutes(b.startTime));
  const ends = blocks.map(b => timeToMinutes(b.endTime));
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

/** Return total work minutes for an employee on a day (sum of all blocks, skip Lunch) */
function empDayWorkMinutes(blocks) {
  return blocks
    .filter(b => b.type !== 'Lunch' && b.type !== 'ApprovedOff')
    .reduce((acc, b) => acc + (b.duration ? b.duration * 60 : (timeToMinutes(b.endTime) - timeToMinutes(b.startTime))), 0);
}

/** Day index (0=Mon … 6=Sun) to day name */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayName(dayIndex) {
  return DAY_NAMES[dayIndex] ?? `Day${dayIndex}`;
}

function empName(employees, empId) {
  return employees.find(e => e.id === empId)?.name ?? empId;
}

function empRole(employees, empId) {
  return employees.find(e => e.id === empId)?.role ?? '';
}

/** Parse a role string that may be comma-separated ("SM,AM,SUP") or an array */
function parseRoles(roleVal) {
  if (!roleVal) return [];
  if (Array.isArray(roleVal)) return roleVal;
  return String(roleVal).split(',').map(r => r.trim());
}

/** Check if employee role matches a role filter (undefined = all) */
function roleMatches(employees, empId, roleFilter) {
  if (!roleFilter) return true;
  const roles = parseRoles(roleFilter);
  if (!roles.length || roles[0] === 'Any' || roles[0] === '') return true;
  return roles.includes(empRole(employees, empId));
}

/** Total work hours for an employee in a given week */
function empWeekHours(scheduleData, empId, weekIndex) {
  let total = 0;
  for (let d = 0; d < 7; d++) {
    const blocks = empDayBlocks(scheduleData, empId, weekIndex, d);
    total += empDayWorkMinutes(blocks);
  }
  return total / 60;
}

// ─── Individual Validators ────────────────────────────────────────────────────

function validateCOVERAGE(rule, scheduleData, employees) {
  const { role, minimumCount, days, timeStart, timeEnd, taskType } = rule.parameters;
  const violations = [];
  const allowedRoles = parseRoles(role);
  const windowStart = timeToMinutes(timeStart);
  const windowEnd = timeToMinutes(timeEnd);

  for (const [weekStr, weekData] of Object.entries(scheduleData)) {
    const weekIndex = Number(weekStr);
    for (let d = 0; d < 7; d++) {
      const dName = dayName(d);
      if (days && !days.includes(dName)) continue;

      // Count employees whose shift covers the window
      let count = 0;
      for (const [empId, empWeek] of Object.entries(weekData)) {
        const role_ = empRole(employees, empId);
        if (allowedRoles.length && allowedRoles[0] !== 'Any' && !allowedRoles.includes(role_)) continue;

        const blocks = empDayBlocks(scheduleData, empId, weekIndex, d);
        const relevant = taskType ? blocks.filter(b => b.type === taskType) : blocks.filter(b => b.type !== 'Lunch' && b.type !== 'ApprovedOff');
        const covers = relevant.some(b => {
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);
          return bStart <= windowStart && bEnd >= windowEnd;
        });
        if (covers) count++;
      }

      if (count < minimumCount) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Week ${weekIndex + 1} ${dName}: only ${count}/${minimumCount} required ${role} coverage during ${timeStart}–${timeEnd}${taskType ? ` (${taskType})` : ''}`,
        });
      }
    }
  }
  return violations;
}

function validateSHIFT_GAP(rule, scheduleData, employees) {
  const { minimumGapHours } = rule.parameters;
  const minGapMin = minimumGapHours * 60;
  const violations = [];

  const weeks = getWeeks(scheduleData);
  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    for (const weekIndex of weeks) {
      for (let d = 0; d < 6; d++) {
        const todayBlocks = empDayBlocks(scheduleData, empId, weekIndex, d);
        const tomorrowBlocks = empDayBlocks(scheduleData, empId, weekIndex, d + 1);
        if (!todayBlocks.length || !tomorrowBlocks.length) continue;

        const todayEnd = Math.max(...todayBlocks.map(b => timeToMinutes(b.endTime)));
        const tomorrowStart = Math.min(...tomorrowBlocks.map(b => timeToMinutes(b.startTime)));
        // gap: (24*60 - todayEnd) + tomorrowStart
        const gap = (24 * 60 - todayEnd) + tomorrowStart;
        if (gap < minGapMin) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${empName(employees, empId)}: only ${Math.floor(gap / 60)}h ${gap % 60}m gap between ${dayName(d)} and ${dayName(d + 1)} (week ${weekIndex + 1}), need ${minimumGapHours}h`,
          });
        }
      }
    }
  }
  return violations;
}

function validateMAX_DAYS(rule, scheduleData, employees) {
  const { maxDaysPerWeek, roleFilter } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    if (!roleMatches(employees, empId, roleFilter)) continue;
    for (const weekIndex of weeks) {
      let daysWorked = 0;
      for (let d = 0; d < 7; d++) {
        const blocks = empDayBlocks(scheduleData, empId, weekIndex, d).filter(b => b.type !== 'ApprovedOff');
        if (blocks.length > 0) daysWorked++;
      }
      if (daysWorked > maxDaysPerWeek) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${empName(employees, empId)}: worked ${daysWorked} days in week ${weekIndex + 1} (max ${maxDaysPerWeek})`,
        });
      }
    }
  }
  return violations;
}

function validateCONSECUTIVE_DAYS_OFF(rule, scheduleData, employees) {
  const { minConsecutiveDaysOff, roleFilter } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    if (!roleMatches(employees, empId, roleFilter)) continue;
    for (const weekIndex of weeks) {
      const worked = Array.from({ length: 7 }, (_, d) => {
        const blocks = empDayBlocks(scheduleData, empId, weekIndex, d).filter(b => b.type !== 'ApprovedOff');
        return blocks.length > 0;
      });

      // Find longest consecutive OFF streak
      let maxOff = 0, cur = 0;
      for (const w of worked) {
        if (!w) { cur++; maxOff = Math.max(maxOff, cur); } else cur = 0;
      }

      if (maxOff < minConsecutiveDaysOff) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${empName(employees, empId)}: only ${maxOff} consecutive day(s) off in week ${weekIndex + 1} (need ${minConsecutiveDaysOff})`,
        });
      }
    }
  }
  return violations;
}

function validateNO_CLOPENING(rule, scheduleData, employees) {
  const violations = [];
  const weeks = getWeeks(scheduleData);
  const CLOSE_AFTER = 20 * 60;  // 8 PM
  const OPEN_BEFORE = 9 * 60;   // 9 AM

  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    for (const weekIndex of weeks) {
      for (let d = 0; d < 6; d++) {
        const todayBlocks = empDayBlocks(scheduleData, empId, weekIndex, d).filter(b => b.type !== 'ApprovedOff');
        const tomorrowBlocks = empDayBlocks(scheduleData, empId, weekIndex, d + 1).filter(b => b.type !== 'ApprovedOff');
        if (!todayBlocks.length || !tomorrowBlocks.length) continue;

        const todayEnd = Math.max(...todayBlocks.map(b => timeToMinutes(b.endTime)));
        const tomorrowStart = Math.min(...tomorrowBlocks.map(b => timeToMinutes(b.startTime)));
        if (todayEnd > CLOSE_AFTER && tomorrowStart < OPEN_BEFORE) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${empName(employees, empId)}: clopening — closes after 8PM on ${dayName(d)} and opens before 9AM on ${dayName(d + 1)} (week ${weekIndex + 1})`,
          });
        }
      }
    }
  }
  return violations;
}

function validateMAX_CONSECUTIVE_DAYS(rule, scheduleData, employees) {
  const { maxConsecutiveDays } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData).sort((a, b) => a - b);

  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    // Build a flat array of 28 booleans (4 weeks × 7 days)
    const workedFlat = [];
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 7; d++) {
        const blocks = empDayBlocks(scheduleData, empId, w, d).filter(b => b.type !== 'ApprovedOff');
        workedFlat.push(blocks.length > 0);
      }
    }

    let streak = 0;
    for (let i = 0; i < workedFlat.length; i++) {
      if (workedFlat[i]) {
        streak++;
        if (streak > maxConsecutiveDays) {
          const wk = Math.floor(i / 7);
          const dy = i % 7;
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${empName(employees, empId)}: ${streak} consecutive days worked (max ${maxConsecutiveDays}) — hit on week ${wk + 1} ${dayName(dy)}`,
          });
          streak = 0; // reset to avoid repeated flags for same run
        }
      } else {
        streak = 0;
      }
    }
  }
  return violations;
}

function validateSHIFT_WINDOW(rule, scheduleData, employees) {
  const { earliestStart, latestEnd, taskType } = rule.parameters;
  const minStart = earliestStart ? timeToMinutes(earliestStart) : null;
  const maxEnd = latestEnd ? timeToMinutes(latestEnd) : null;
  const violations = [];

  for (const { weekIndex, empId, dayIndex, block } of allBlocks(scheduleData)) {
    if (block.type === 'ApprovedOff' || block.type === 'Lunch') continue;
    if (taskType && block.type !== taskType) continue;

    const bStart = timeToMinutes(block.startTime);
    const bEnd = timeToMinutes(block.endTime);

    if (minStart !== null && bStart < minStart) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${empName(employees, empId)}: shift starts at ${block.startTime} on week ${weekIndex + 1} ${dayName(dayIndex)} — before earliest ${earliestStart}`,
      });
    }
    if (maxEnd !== null && bEnd > maxEnd) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${empName(employees, empId)}: shift ends at ${block.endTime} on week ${weekIndex + 1} ${dayName(dayIndex)} — after latest ${latestEnd}`,
      });
    }
  }
  return violations;
}

function validateSHIFT_LENGTH(rule, scheduleData, employees) {
  const { role, requiredHours, lunchIncluded } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const empId of [...new Set(allBlocks(scheduleData).map(e => e.empId))]) {
    if (empRole(employees, empId) !== role) continue;
    for (const weekIndex of weeks) {
      for (let d = 0; d < 7; d++) {
        const blocks = empDayBlocks(scheduleData, empId, weekIndex, d).filter(b => b.type !== 'ApprovedOff');
        if (!blocks.length) continue;

        const bounds = empDayBounds(blocks);
        const totalSpanMin = bounds.end - bounds.start;
        const workMin = lunchIncluded
          ? totalSpanMin
          : empDayWorkMinutes(blocks);
        const workHours = workMin / 60;

        if (Math.abs(workHours - requiredHours) > 0.25) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${empName(employees, empId)} (${role}): shift on week ${weekIndex + 1} ${dayName(d)} is ${workHours.toFixed(1)}h (expected ${requiredHours}h)`,
          });
        }
      }
    }
  }
  return violations;
}

function validateBLOCK_LIMIT(rule, scheduleData, employees) {
  const { taskType, maxHours, minHours, maxConsecutive } = rule.parameters;
  const violations = [];

  for (const [weekStr, weekData] of Object.entries(scheduleData)) {
    const weekIndex = Number(weekStr);
    for (const [empId, empWeek] of Object.entries(weekData)) {
      for (let d = 0; d < 7; d++) {
        const allDayBlocks = empDayBlocks(scheduleData, empId, weekIndex, d);
        const relevant = taskType && taskType !== 'any'
          ? allDayBlocks.filter(b => b.type === taskType)
          : allDayBlocks.filter(b => b.type !== 'ApprovedOff' && b.type !== 'Lunch');

        if (!relevant.length) continue;

        for (const block of relevant) {
          const bStart = timeToMinutes(block.startTime);
          const bEnd = timeToMinutes(block.endTime);
          const hours = (bEnd - bStart) / 60;

          if (maxHours !== undefined && hours > maxHours) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `${empName(employees, empId)}: ${taskType ?? 'block'} on week ${weekIndex + 1} ${dayName(d)} is ${hours.toFixed(1)}h (max ${maxHours}h)`,
            });
          }
          if (minHours !== undefined && hours < minHours) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `${empName(employees, empId)}: ${taskType ?? 'block'} on week ${weekIndex + 1} ${dayName(d)} is ${hours.toFixed(1)}h (min ${minHours}h)`,
            });
          }
        }

        // maxConsecutive: count days in a row with this taskType worked
        if (maxConsecutive !== undefined) {
          // Check cross-day consecutive count around this day
          let streak = 0;
          for (let dd = 0; dd < 7; dd++) {
            const ddBlocks = empDayBlocks(scheduleData, empId, weekIndex, dd);
            const hasTask = taskType && taskType !== 'any'
              ? ddBlocks.some(b => b.type === taskType)
              : ddBlocks.some(b => b.type !== 'ApprovedOff' && b.type !== 'Lunch');
            if (hasTask) {
              streak++;
              if (streak > maxConsecutive) {
                violations.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  severity: rule.severity,
                  message: `${empName(employees, empId)}: more than ${maxConsecutive} consecutive days with ${taskType ?? 'task'} block in week ${weekIndex + 1}`,
                });
                streak = 0;
              }
            } else {
              streak = 0;
            }
          }
        }
      }
    }
  }
  return violations;
}

function validateLOD_AT_TIME(rule, scheduleData, employees, settings) {
  const { events } = rule.parameters;
  const storeOpen = settings?.storeOpen ?? '07:30';
  const storeClose = settings?.storeClose ?? '20:30';
  const violations = [];

  for (const [weekStr, weekData] of Object.entries(scheduleData)) {
    const weekIndex = Number(weekStr);
    for (let d = 0; d < 7; d++) {
      if (events.includes('store_open')) {
        const openMin = timeToMinutes(storeOpen);
        const hasLODAtOpen = Object.entries(weekData).some(([empId, empWeek]) => {
          const blocks = empDayBlocks(scheduleData, empId, weekIndex, d);
          return blocks.some(b => b.type === 'LOD' &&
            timeToMinutes(b.startTime) <= openMin && timeToMinutes(b.endTime) >= openMin);
        });
        if (!hasLODAtOpen) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Week ${weekIndex + 1} ${dayName(d)}: no LOD block active at store open (${storeOpen})`,
          });
        }
      }
      if (events.includes('store_close')) {
        const closeMin = timeToMinutes(storeClose);
        const hasLODAtClose = Object.entries(weekData).some(([empId, empWeek]) => {
          const blocks = empDayBlocks(scheduleData, empId, weekIndex, d);
          return blocks.some(b => b.type === 'LOD' &&
            timeToMinutes(b.startTime) <= closeMin && timeToMinutes(b.endTime) >= closeMin);
        });
        if (!hasLODAtClose) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Week ${weekIndex + 1} ${dayName(d)}: no LOD block active at store close (${storeClose})`,
          });
        }
      }
    }
  }
  return violations;
}

function validateTASK_OVERLAP(rule, scheduleData, employees) {
  const { taskName, requiredOverlap } = rule.parameters;
  const violations = [];
  // This rule checks that a named task block has an overlapping block of requiredOverlap type.
  // Named tasks are matched by block type or custom label. We match block.type or block.label.

  for (const { weekIndex, empId, dayIndex, block } of allBlocks(scheduleData)) {
    const isTarget = block.type === taskName || block.label === taskName || block.name === taskName;
    if (!isTarget) continue;
    if (!requiredOverlap || requiredOverlap === 'None') continue;

    const bStart = timeToMinutes(block.startTime);
    const bEnd = timeToMinutes(block.endTime);
    const dayBlocks = empDayBlocks(scheduleData, empId, weekIndex, dayIndex);

    const hasOverlap = dayBlocks.some(other => {
      if (other === block) return false;
      if (other.type !== requiredOverlap) return false;
      const oStart = timeToMinutes(other.startTime);
      const oEnd = timeToMinutes(other.endTime);
      return oStart < bEnd && oEnd > bStart;
    });

    if (!hasOverlap) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${empName(employees, empId)}: "${taskName}" block on week ${weekIndex + 1} ${dayName(dayIndex)} has no overlapping ${requiredOverlap} block`,
      });
    }
  }
  return violations;
}

function validateROLE_ONLY(rule, scheduleData, employees) {
  const { taskType, allowedRoles, priorityOnly } = rule.parameters;
  if (priorityOnly) return []; // advisory only, not a hard check
  const violations = [];

  for (const { weekIndex, empId, dayIndex, block } of allBlocks(scheduleData)) {
    if (block.type !== taskType) continue;
    const role = empRole(employees, empId);
    if (!allowedRoles.includes(role)) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${empName(employees, empId)} (${role}): not allowed to be assigned ${taskType} on week ${weekIndex + 1} ${dayName(dayIndex)} (allowed: ${allowedRoles.join(', ')})`,
      });
    }
  }
  return violations;
}

function validateHOURS_TARGET(rule, scheduleData, employees) {
  const { direction, threshold, roleFilter } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const emp of employees) {
    if (!roleMatches(employees, emp.id, roleFilter)) continue;
    for (const weekIndex of weeks) {
      const actual = empWeekHours(scheduleData, emp.id, weekIndex);
      if (actual === 0) continue; // unscheduled week

      const target = emp.targetHours ?? 0;
      if (!target) continue;

      if (direction === 'over' && actual > target + (threshold ?? 0)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${emp.name}: ${actual.toFixed(1)}h in week ${weekIndex + 1} exceeds target ${target}h by more than ${threshold}h`,
        });
      } else if (direction === 'under') {
        const ratio = typeof threshold === 'number' && threshold <= 1 ? threshold : null;
        const hourDiff = typeof threshold === 'number' && threshold > 1 ? threshold : null;

        if (ratio !== null && actual < target * ratio) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${emp.name}: ${actual.toFixed(1)}h in week ${weekIndex + 1} is below ${(ratio * 100).toFixed(0)}% of target ${target}h`,
          });
        } else if (hourDiff !== null && actual < target - hourDiff) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${emp.name}: ${actual.toFixed(1)}h in week ${weekIndex + 1} is more than ${hourDiff}h below target ${target}h`,
          });
        }
      }
    }
  }
  return violations;
}

function validateOVERTIME_FLAG(rule, scheduleData, employees) {
  const { hourCap, roleFilter } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const emp of employees) {
    if (!roleMatches(employees, emp.id, roleFilter)) continue;
    for (const weekIndex of weeks) {
      const actual = empWeekHours(scheduleData, emp.id, weekIndex);
      if (actual > hourCap) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${emp.name}: ${actual.toFixed(1)}h in week ${weekIndex + 1} exceeds ${hourCap}h cap`,
        });
      }
    }
  }
  return violations;
}

function validateLABOR_BUDGET(rule, scheduleData, employees, laborBudget) {
  const { thresholdType, maximumValue, alertBuffer } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const weekIndex of weeks) {
    let totalHours = 0;
    let totalCost = 0;
    for (const emp of employees) {
      const hrs = empWeekHours(scheduleData, emp.id, weekIndex);
      totalHours += hrs;
      totalCost += hrs * (emp.hourlyRate ?? 0);
    }

    if (thresholdType === 'hours') {
      const budget = maximumValue ?? laborBudget?.hours ?? 0;
      if (!budget) continue;
      const buffer = alertBuffer ?? 0;
      if (totalHours > budget * (1 + buffer / 100)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Week ${weekIndex + 1}: total ${totalHours.toFixed(1)}h exceeds hour budget ${budget}h (buffer ${buffer}%)`,
        });
      }
    } else if (thresholdType === 'dollars') {
      const budget = maximumValue ?? laborBudget?.dollars ?? 0;
      if (!budget) continue;
      const buffer = alertBuffer ?? 0;
      if (totalCost > budget * (1 + buffer / 100)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Week ${weekIndex + 1}: labor cost $${totalCost.toFixed(2)} exceeds budget $${budget} (buffer ${buffer}%)`,
        });
      }
    }
  }
  return violations;
}

function validateROTATION_FAIRNESS(rule, scheduleData, employees, rotation) {
  const { shiftType, maxImbalance, roleFilter } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  // Count per employee across all available weeks
  const counts = {};
  for (const emp of employees) {
    if (!roleMatches(employees, emp.id, roleFilter)) continue;
    counts[emp.id] = 0;

    for (const weekIndex of weeks) {
      for (let d = 0; d < 7; d++) {
        const blocks = empDayBlocks(scheduleData, emp.id, weekIndex, d).filter(b => b.type !== 'ApprovedOff');
        if (!blocks.length) continue;

        const bounds = empDayBounds(blocks);
        if (!bounds) continue;

        if (shiftType === 'opening' && bounds.start < 9 * 60) counts[emp.id]++;
        if (shiftType === 'closing' && bounds.end > 20 * 60) counts[emp.id]++;
        if (shiftType === 'weekend' && (d === 5 || d === 6)) counts[emp.id]++;
        if (shiftType === 'fridaySaturdayNight' && (d === 4 || d === 5) && bounds.end > 20 * 60) counts[emp.id]++;
        if (shiftType === 'daysOff') {
          // count days worked (invert later for days off)
          counts[emp.id]++;
        }
      }
    }
  }

  const vals = Object.values(counts).filter(v => v > 0);
  if (vals.length < 2) return violations;

  const maxVal = Math.max(...vals);
  const minVal = Math.min(...vals);

  if (maxVal - minVal > maxImbalance) {
    const overloaded = Object.entries(counts)
      .filter(([, v]) => v === maxVal)
      .map(([id]) => empName(employees, id));
    violations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Rotation imbalance for "${shiftType}": range ${minVal}–${maxVal} (max imbalance ${maxImbalance}). High: ${overloaded.join(', ')}`,
    });
  }
  return violations;
}

function validatePLANNING_HOURS(rule, scheduleData, employees) {
  const { role, requiredHours, spreadDays } = rule.parameters;
  const violations = [];
  const weeks = getWeeks(scheduleData);

  for (const emp of employees) {
    if (role && emp.role !== role) continue;
    for (const weekIndex of weeks) {
      let totalPlanMin = 0;
      let daysWithPlanning = 0;

      for (let d = 0; d < 7; d++) {
        const blocks = empDayBlocks(scheduleData, emp.id, weekIndex, d).filter(b => b.type === 'Planning');
        const dayMin = blocks.reduce((acc, b) => acc + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)), 0);
        if (dayMin > 0) daysWithPlanning++;
        totalPlanMin += dayMin;
      }

      const totalPlanHours = totalPlanMin / 60;

      if (requiredHours > 0 && totalPlanHours < requiredHours) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${emp.name} (${emp.role}): ${totalPlanHours.toFixed(1)}h planning in week ${weekIndex + 1} (need ${requiredHours}h)`,
        });
      }
      if (spreadDays > 0 && daysWithPlanning < spreadDays && totalPlanHours > 0) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${emp.name} (${emp.role}): planning spread across only ${daysWithPlanning} day(s) in week ${weekIndex + 1} (need ${spreadDays})`,
        });
      }
    }
  }
  return violations;
}

// CUSTOM_SOFT — free-text reminder, never violates
function validateCUSTOM_SOFT() {
  return [];
}

// ─── Dispatch Map ─────────────────────────────────────────────────────────────

const VALIDATORS = {
  COVERAGE: validateCOVERAGE,
  SHIFT_GAP: validateSHIFT_GAP,
  MAX_DAYS: validateMAX_DAYS,
  CONSECUTIVE_DAYS_OFF: validateCONSECUTIVE_DAYS_OFF,
  NO_CLOPENING: validateNO_CLOPENING,
  MAX_CONSECUTIVE_DAYS: validateMAX_CONSECUTIVE_DAYS,
  SHIFT_WINDOW: validateSHIFT_WINDOW,
  SHIFT_LENGTH: validateSHIFT_LENGTH,
  BLOCK_LIMIT: validateBLOCK_LIMIT,
  LOD_AT_TIME: validateLOD_AT_TIME,
  TASK_OVERLAP: validateTASK_OVERLAP,
  ROLE_ONLY: validateROLE_ONLY,
  HOURS_TARGET: validateHOURS_TARGET,
  OVERTIME_FLAG: validateOVERTIME_FLAG,
  LABOR_BUDGET: validateLABOR_BUDGET,
  ROTATION_FAIRNESS: validateROTATION_FAIRNESS,
  PLANNING_HOURS: validatePLANNING_HOURS,
  CUSTOM_SOFT: validateCUSTOM_SOFT,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check all active (isOn) rules against scheduleData.
 *
 * @param {Array}  rules        - array of rule objects
 * @param {Object} scheduleData - { [weekIndex]: { [empId]: { [dayIndex]: { blocks } } } }
 * @param {Array}  employees    - array of employee objects
 * @param {Object} rotation     - { startDate, currentWeek }
 * @param {Object} [extras]     - optional extra context: { settings, laborBudget }
 * @returns {Array} violations  - [{ ruleId, ruleName, severity, message }]
 */
export function checkViolations(rules, scheduleData, employees, rotation, extras = {}) {
  if (!rules?.length || !scheduleData || !employees?.length) return [];

  const activeRules = rules.filter(r => r.isOn === true);
  if (!activeRules.length) return [];

  const { settings, laborBudget } = extras;
  const violations = [];

  for (const rule of activeRules) {
    const validator = VALIDATORS[rule.enforcementType];
    if (!validator) continue;

    try {
      const params = rule.parameters ?? {};
      let ruleViolations;

      // Validators that need extra context get it passed explicitly
      if (rule.enforcementType === 'LOD_AT_TIME') {
        ruleViolations = validator({ ...rule, parameters: params }, scheduleData, employees, settings);
      } else if (rule.enforcementType === 'LABOR_BUDGET') {
        ruleViolations = validator({ ...rule, parameters: params }, scheduleData, employees, laborBudget);
      } else if (rule.enforcementType === 'ROTATION_FAIRNESS') {
        ruleViolations = validator({ ...rule, parameters: params }, scheduleData, employees, rotation);
      } else {
        ruleViolations = validator({ ...rule, parameters: params }, scheduleData, employees);
      }

      violations.push(...ruleViolations);
    } catch (err) {
      console.error(`[rulesEngine] Error running rule "${rule.name}" (${rule.enforcementType}):`, err);
    }
  }

  return violations;
}

/**
 * Auto-optimize: apply rules sorted by priority tier, return optimized schedule
 * and lists of resolved/unresolved violations.
 *
 * Currently returns the schedule unchanged with all violations as unresolved
 * (full constraint-solving optimization is beyond scope of this engine layer).
 */
export function autoOptimize(schedule, rules, employees, rotation, extras = {}) {
  const activeSorted = (rules ?? [])
    .filter(r => r.isOn)
    .sort((a, b) => {
      const order = { High: 0, Medium: 1, Low: 2 };
      return (order[a.priorityTier ?? 'Low'] ?? 2) - (order[b.priorityTier ?? 'Low'] ?? 2);
    });

  const violations = checkViolations(activeSorted, schedule, employees, rotation, extras);

  return {
    optimizedSchedule: schedule,
    resolved: [],
    unresolved: violations,
  };
}

/**
 * Summarize violations grouped by severity.
 */
export function summarizeViolations(violations) {
  const hard = violations.filter(v => v.severity === 'HARD');
  const soft = violations.filter(v => v.severity === 'SOFT');
  return { hard, soft, total: violations.length };
}
