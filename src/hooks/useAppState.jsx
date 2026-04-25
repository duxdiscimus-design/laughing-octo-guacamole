import React, { createContext, useContext } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { LS_KEYS } from '../constants';

export const DEFAULT_EMPLOYEES = [
  { id: '1', name: 'Store Manager', role: 'SM', targetHours: 45, shiftLength: 9, lunchMinutes: 60, lunchPaid: true, hourlyRate: 25, notes: '', planningHours: 20 },
  { id: '2', name: 'Assistant Manager 1', role: 'AM', targetHours: 40, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 20, notes: '', planningHours: 6 },
  { id: '3', name: 'Assistant Manager 2', role: 'AM', targetHours: 40, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 20, notes: '', planningHours: 6 },
  { id: '4', name: 'Supervisor 1', role: 'SUP', targetHours: 36, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 17, notes: '', planningHours: 3 },
  { id: '5', name: 'Supervisor 2', role: 'SUP', targetHours: 36, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 17, notes: '', planningHours: 3 },
  { id: '6', name: 'Supervisor 3', role: 'SUP', targetHours: 36, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 17, notes: '', planningHours: 3 },
  { id: '7', name: 'Full-Time Cashier', role: 'FTC', targetHours: 36, shiftLength: 8, lunchMinutes: 30, lunchPaid: true, hourlyRate: 15, notes: '', planningHours: 0 },
  { id: '8', name: 'Part-Time Associate 1', role: 'PT', targetHours: 12, shiftLength: 5, lunchMinutes: 0, lunchPaid: false, hourlyRate: 14, notes: '', planningHours: 0 },
  { id: '9', name: 'Part-Time Associate 2', role: 'PT', targetHours: 12, shiftLength: 5, lunchMinutes: 0, lunchPaid: false, hourlyRate: 14, notes: '', planningHours: 0 },
  { id: '10', name: 'Part-Time Associate 3', role: 'PT', targetHours: 12, shiftLength: 5, lunchMinutes: 0, lunchPaid: false, hourlyRate: 14, notes: '', planningHours: 0 },
  { id: '11', name: 'Part-Time Associate 4', role: 'PT', targetHours: 12, shiftLength: 5, lunchMinutes: 0, lunchPaid: false, hourlyRate: 14, notes: '', planningHours: 0 },
];

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [session, setSession] = useLocalStorage(LS_KEYS.SESSION, null);
  const [employees, setEmployees] = useLocalStorage(LS_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  const [schedule, setSchedule] = useLocalStorage(LS_KEYS.SCHEDULE, {});
  const [rules, setRules] = useLocalStorage(LS_KEYS.RULES, []);
  const [ruleTemplates, setRuleTemplates] = useLocalStorage(LS_KEYS.RULE_TEMPLATES, []);
  const [rotationStart, setRotationStart] = useLocalStorage(LS_KEYS.ROTATION_START, null);
  const [laborBudget, setLaborBudget] = useLocalStorage(LS_KEYS.LABOR_BUDGET, { hours: 0, dollars: 0 });
  const [tasks, setTasks] = useLocalStorage(LS_KEYS.TASKS, []);
  const [requests, setRequests] = useLocalStorage(LS_KEYS.REQUESTS, []);
  const [settings, setSettings] = useLocalStorage(LS_KEYS.SETTINGS, {
    storeOpen: '07:30',
    storeClose: '20:30',
    storeName: 'Harbor Freight Tools',
    storeNumber: '',
    geminiApiKey: '',
  });

  const value = {
    session, setSession,
    employees, setEmployees,
    schedule, setSchedule,
    rules, setRules,
    ruleTemplates, setRuleTemplates,
    rotationStart, setRotationStart,
    laborBudget, setLaborBudget,
    tasks, setTasks,
    requests, setRequests,
    settings, setSettings,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
