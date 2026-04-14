import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { LS_KEYS } from '../constants';
import { checkViolations } from '../engine/rulesEngine';

export function useRules() {
  const [rules, setRules] = useLocalStorage(LS_KEYS.RULES, []);
  const [templates, setTemplates] = useLocalStorage(LS_KEYS.RULE_TEMPLATES, []);

  const addRule = useCallback((ruleData) => {
    const newRule = {
      id: crypto.randomUUID(),
      ...ruleData,
      isOn: false,
      priorityTier: ruleData.priorityTier ?? 'Medium',
      createdAt: Date.now(),
    };
    setRules(prev => [...prev, newRule]);
    return newRule;
  }, [setRules]);

  const updateRule = useCallback((id, updates) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [setRules]);

  const deleteRule = useCallback((id) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, [setRules]);

  const toggleRule = useCallback((id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isOn: !r.isOn } : r));
  }, [setRules]);

  const setTier = useCallback((id, tier) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, priorityTier: tier } : r));
  }, [setRules]);

  const saveTemplate = useCallback((ruleData) => {
    const template = { id: crypto.randomUUID(), ...ruleData, createdAt: Date.now() };
    setTemplates(prev => [...prev, template]);
    return template;
  }, [setTemplates]);

  const deleteTemplate = useCallback((id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [setTemplates]);

  /**
   * Run checkViolations for all active rules against provided schedule context.
   * @param {Object} scheduleData
   * @param {Array}  employees
   * @param {Object} rotation
   * @param {Object} extras - { settings, laborBudget }
   */
  const getViolations = useCallback((scheduleData, employees, rotation, extras = {}) => {
    return checkViolations(rules, scheduleData, employees, rotation, extras);
  }, [rules]);

  return {
    rules,
    templates,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    setTier,
    saveTemplate,
    deleteTemplate,
    getViolations,
    activeCount: rules.filter(r => r.isOn).length,
  };
}
