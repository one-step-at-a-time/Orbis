// useHealthLog — Persistência de logs diários de saúde
// Armazena: sono, energia, peso e nota. Histórico de 90 dias.

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Estrutura de cada entrada:
 * { date: 'YYYY-MM-DD', ts: number, sleep_hours: number, energy: 1-5, weight: number|null, notes: string }
 */
export function useHealthLog() {
  const [logs, setLogs] = useLocalStorage('orbis_health_logs', []);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date === today) || null;

  /** Upsert do dia atual. Mantém os últimos 90 dias. */
  const logToday = useCallback((data) => {
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== today);
      const entry = { date: today, ts: Date.now(), ...data };
      return [entry, ...filtered]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 90);
    });
  }, [setLogs, today]);

  /**
   * Retorna um array de exatamente `days` entradas, da mais antiga para a mais recente.
   * Dias sem registro têm `empty: true` e campos ausentes.
   */
  const getRecentLogs = useCallback((days = 7) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      result.push(log ? { ...log } : { date: dateStr, empty: true });
    }
    return result;
  }, [logs]);

  return { logs, todayLog, logToday, getRecentLogs };
}
