// useHealthLog — Persistência de logs diários de saúde
// Armazena: sono, energia, peso e nota. Histórico de 90 dias.
// Sync opcional com Supabase (fire-and-forget) se orbis_supabase_url estiver configurado.

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { syncHealthLog, isSupabaseConfigured } from '../services/supabaseService';

/**
 * Estrutura de cada entrada:
 * { date: 'YYYY-MM-DD', ts: number, sleep_hours: number, energy: 1-5, weight: number|null, notes: string }
 */
export function useHealthLog() {
  const [logs, setLogs] = useLocalStorage('orbis_health_logs', []);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date === today) || null;

  /** Upsert do dia atual. Mantém os últimos 90 dias. Sync Supabase em background. */
  const logToday = useCallback((data) => {
    const entry = { date: today, ts: Date.now(), ...data };

    // 1. localStorage imediato
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== today);
      return [entry, ...filtered]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 90);
    });

    // 2. Supabase em background (fire-and-forget, sem bloquear a UI)
    if (isSupabaseConfigured()) {
      syncHealthLog(entry).catch(console.error);
    }
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
