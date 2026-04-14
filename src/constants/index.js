export const TASK_TYPES = ['LOD','Cashier','Planning','ConfCall','Floor','Open','Close','Lunch','CashOffice','Custom','ApprovedOff'];

export const TASK_COLORS = {
  LOD: '#f5c842',
  Cashier: '#3b82f6',
  Planning: '#8b5cf6',
  ConfCall: '#14b8a6',
  Floor: '#22c55e',
  Open: '#f97316',
  Close: '#ef4444',
  Lunch: '#6b7280',
  CashOffice: '#ec4899',
  Custom: '#6366f1',
  ApprovedOff: '#2a2a32',
};

export const ROLES = ['SM','AM','SUP','FTC','PT'];

export const DAYS_OF_WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export const ENFORCEMENT_TYPES = [
  'COVERAGE','SHIFT_GAP','MAX_DAYS','CONSECUTIVE_DAYS_OFF','NO_CLOPENING',
  'MAX_CONSECUTIVE_DAYS','SHIFT_WINDOW','SHIFT_LENGTH','BLOCK_LIMIT','LOD_AT_TIME',
  'TASK_OVERLAP','ROLE_ONLY','HOURS_TARGET','OVERTIME_FLAG','LABOR_BUDGET',
  'ROTATION_FAIRNESS','PLANNING_HOURS','CUSTOM_SOFT',
];

export const RULE_CATEGORIES = ['Leadership','ShiftStructure','Cashier','Meetings','Planning','Fairness','Labor','Custom'];

export const LS_KEYS = {
  SESSION: 'hft_session',
  EMPLOYEES: 'hft_employees',
  SCHEDULE: 'hft_schedule',
  RULES: 'hft_rules',
  RULE_TEMPLATES: 'hft_rule_templates',
  ROTATION_START: 'hft_rotation_start',
  LABOR_BUDGET: 'hft_labor_budget',
  TASKS: 'hft_tasks',
  REQUESTS: 'hft_requests',
  SETTINGS: 'hft_settings',
  FIRST_LAUNCH: 'hft_first_launch',
};
