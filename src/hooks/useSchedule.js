import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { LS_KEYS } from '../constants';
import { generateSchedule } from '../engine/schedulingEngine';

export function useSchedule() {
  const [scheduleData, setScheduleData] = useLocalStorage(LS_KEYS.SCHEDULE, {});

  const getWeekSchedule = (weekIndex) => scheduleData[weekIndex] || {};

  const setDaySchedule = useCallback((weekIndex, employeeId, dayIndex, dayData) => {
    setScheduleData(prev => ({
      ...prev,
      [weekIndex]: {
        ...(prev[weekIndex] || {}),
        [employeeId]: {
          ...(prev[weekIndex]?.[employeeId] || {}),
          [dayIndex]: { ...dayData, isManualOverride: true },
        },
      },
    }));
  }, [setScheduleData]);

  const setBlockInDay = useCallback((weekIndex, employeeId, dayIndex, blockId, blockData) => {
    setScheduleData(prev => {
      const daySchedule = prev[weekIndex]?.[employeeId]?.[dayIndex] || { blocks: [] };
      const blocks = daySchedule.blocks.map(b =>
        b.id === blockId ? { ...b, ...blockData } : b,
      );
      return {
        ...prev,
        [weekIndex]: {
          ...(prev[weekIndex] || {}),
          [employeeId]: {
            ...(prev[weekIndex]?.[employeeId] || {}),
            [dayIndex]: { ...daySchedule, blocks, isManualOverride: true },
          },
        },
      };
    });
  }, [setScheduleData]);

  const generateWeekSchedule = useCallback((
    weekIndex, employees, availability, activeRules, rotation,
  ) => {
    const existing = scheduleData[weekIndex] || {};
    const generated = generateSchedule(
      employees, availability, activeRules, rotation, existing, weekIndex,
    );
    setScheduleData(prev => ({ ...prev, [weekIndex]: generated }));
    return generated;
  }, [scheduleData, setScheduleData]);

  const clearWeekSchedule = useCallback((weekIndex) => {
    setScheduleData(prev => {
      const next = { ...prev };
      delete next[weekIndex];
      return next;
    });
  }, [setScheduleData]);

  const clearAllSchedules = useCallback(() => {
    setScheduleData({});
  }, [setScheduleData]);

  const getEmployeeWeekHours = (weekIndex, employeeId) => {
    const week = scheduleData[weekIndex] || {};
    const empDays = week[employeeId] || {};
    let total = 0;
    Object.values(empDays).forEach(day => {
      if (!day.isOff && day.blocks) {
        day.blocks.forEach(b => { total += b.durationHours || 0; });
      }
    });
    return total;
  };

  return {
    scheduleData,
    getWeekSchedule,
    setDaySchedule,
    setBlockInDay,
    generateWeekSchedule,
    clearWeekSchedule,
    clearAllSchedules,
    getEmployeeWeekHours,
  };
}
