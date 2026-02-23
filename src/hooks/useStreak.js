// useStreak — Rastreia dias consecutivos com todas as missões completas

import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * @param {{ missions: Array, missionState: object }} param
 * missions e missionState vêm de useMissions() já chamado no hook pai.
 */
export function useStreak({ missions, missionState }) {
  const [streak, setStreak] = useLocalStorage('orbis_streak', {
    current: 0,
    best: 0,
    lastFullDate: null,
  });

  const today = new Date().toISOString().split('T')[0];

  const allComplete =
    missions.length > 0 &&
    missions.every(m =>
      m.type === 'counter'
        ? (missionState.progress?.[m.id] || 0) >= m.max
        : !!missionState.completed?.[m.id]
    );

  useEffect(() => {
    if (!allComplete) return;

    // Usa updater para evitar dependency loop com `streak`
    setStreak(prev => {
      if (prev.lastFullDate === today) return prev; // já contabilizado hoje

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const newCurrent =
        prev.lastFullDate === yesterdayStr ? prev.current + 1 : 1;

      return {
        current: newCurrent,
        best: Math.max(prev.best, newCurrent),
        lastFullDate: today,
      };
    });
  }, [allComplete, today, setStreak]);

  return streak;
}
