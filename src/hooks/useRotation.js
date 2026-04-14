import { useLocalStorage } from './useLocalStorage';
import { LS_KEYS } from '../constants';
import { startOfWeek, addDays, differenceInCalendarWeeks, format } from 'date-fns';

export function useRotation() {
  const [rotationStart, setRotationStart] = useLocalStorage(LS_KEYS.ROTATION_START, null);

  const initRotation = () => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    setRotationStart(format(monday, 'yyyy-MM-dd'));
  };

  const getCurrentWeek = () => {
    if (!rotationStart) return 0;
    const start = new Date(rotationStart);
    const now = new Date();
    const weeks = differenceInCalendarWeeks(now, start, { weekStartsOn: 1 });
    return weeks % 4;
  };

  const getWeekStartDate = (weekIndex) => {
    if (!rotationStart) return null;
    const start = new Date(rotationStart);
    return addDays(start, weekIndex * 7);
  };

  const resetRotation = () => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const newStart = format(monday, 'yyyy-MM-dd');
    setRotationStart(newStart);
    return newStart;
  };

  const currentWeek = getCurrentWeek();
  const weekLabel = `Week ${currentWeek + 1} of 4`;

  return {
    rotationStart,
    initRotation,
    getCurrentWeek,
    getWeekStartDate,
    resetRotation,
    weekLabel,
    currentWeek,
  };
}
