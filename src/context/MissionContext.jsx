import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePlayer } from './PlayerContext';

const MissionContext = createContext(null);

// Missões escaláveis com o level do Caçador
// Reps: 10 em Lv1, +10 a cada 5 levels → Lv5: 20, Lv10: 30, Lv20: 50
// Corrida: 1km em Lv1, +1km a cada 5 levels → Lv5: 2km, Lv10: 3km...
// Leitura: 10min em Lv1, +10min a cada 10 levels
// Meditação: 5min em Lv1, +5min a cada 10 levels
export function getDailyMissions(level) {
    const reps    = 10 + Math.floor(level / 5) * 10;
    const km      = Math.min(10, 1 + Math.floor((level - 1) / 5));
    const readMin = 10 + Math.floor((level - 1) / 10) * 10;
    const medMin  = 5  + Math.floor((level - 1) / 10) * 5;
    return [
        { id: 'flexoes',      label: `${reps} Flexões`,          type: 'boolean', xp: 150, stats: { STR: 2 } },
        { id: 'abdominais',   label: `${reps} Abdominais`,        type: 'boolean', xp: 120, stats: { STR: 1 } },
        { id: 'agachamentos', label: `${reps} Agachamentos`,      type: 'boolean', xp: 120, stats: { STR: 1, AGI: 1 } },
        { id: 'corrida',      label: `${km}km de Corrida`,        type: 'boolean', xp: 200, stats: { AGI: 2 } },
        { id: 'agua',         label: "8 Copos d'Água",            type: 'counter', max: 8,  xp: 80,  stats: { VIT: 2 } },
        { id: 'sono',         label: '7h+ de Sono',               type: 'boolean', xp: 100, stats: { VIT: 2 } },
        { id: 'leitura',      label: `${readMin}min de Leitura`,  type: 'boolean', xp: 80,  stats: { INT: 2 } },
        { id: 'meditacao',    label: `${medMin}min de Meditação`, type: 'boolean', xp: 60,  stats: { SEN: 2 } },
    ];
}

export const BAD_HABITS = [
    { id: 'dormi_tarde',  label: 'Dormi após meia-noite',     xp: 50, statKey: 'VIT', statLoss: 1 },
    { id: 'pulei_treino', label: 'Pulei o treino',             xp: 80, statKey: 'STR', statLoss: 1 },
    { id: 'sem_agua',     label: 'Não bebi água suficiente',   xp: 40, statKey: 'VIT', statLoss: 1 },
    { id: 'junk_food',    label: 'Comi muito açúcar/junk',     xp: 30, statKey: 'VIT', statLoss: 1 },
    { id: 'tela_noite',   label: 'Usei tela antes de dormir',  xp: 30, statKey: 'SEN', statLoss: 1 },
    { id: 'improdutivo',  label: 'Fui improdutivo o dia todo', xp: 60, statKey: 'INT', statLoss: 1 },
];

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

const INITIAL_MISSION_STATE = {
    completed: {},
    progress: {},
    lastResetDate: null,
    xpGainedToday: 0,
};

export function MissionProvider({ children }) {
    const { gainXPAmount, applyPenalty, applyStatBonus, player } = usePlayer();
    const missions = getDailyMissions(player.level);
    const [missionState, setMissionState] = useLocalStorage('orbis_missions', INITIAL_MISSION_STATE);
    const resetDoneRef = useRef(false);

    useEffect(() => {
        if (resetDoneRef.current) return;
        resetDoneRef.current = true;

        const today = getTodayString();

        if (missionState.lastResetDate && missionState.lastResetDate !== today) {
            // Apply -50 XP for each incomplete mission
            missions.forEach(mission => {
                const isCompleted = mission.type === 'counter'
                    ? (missionState.progress[mission.id] || 0) >= mission.max
                    : !!missionState.completed[mission.id];
                if (!isCompleted) {
                    applyPenalty(50, null, 0);
                }
            });

            setMissionState({
                completed: {},
                progress: {},
                lastResetDate: today,
                xpGainedToday: 0,
            });
        } else if (!missionState.lastResetDate) {
            setMissionState(prev => ({ ...prev, lastResetDate: today }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMission = useCallback((missionId) => {
        const mission = missions.find(m => m.id === missionId);
        if (!mission || mission.type === 'counter') return;

        const isCompleted = !!missionState.completed[missionId];

        if (!isCompleted) {
            gainXPAmount(mission.xp);
            applyStatBonus(mission.stats);
            setMissionState(prev => ({
                ...prev,
                completed: { ...prev.completed, [missionId]: true },
                xpGainedToday: (prev.xpGainedToday || 0) + mission.xp,
            }));
        } else {
            applyPenalty(mission.xp, null, 0);
            const reversal = {};
            Object.entries(mission.stats).forEach(([key, val]) => { reversal[key] = -val; });
            applyStatBonus(reversal);
            setMissionState(prev => {
                const newCompleted = { ...prev.completed };
                delete newCompleted[missionId];
                return {
                    ...prev,
                    completed: newCompleted,
                    xpGainedToday: Math.max(0, (prev.xpGainedToday || 0) - mission.xp),
                };
            });
        }
    }, [missionState, gainXPAmount, applyPenalty, applyStatBonus]);

    const updateWaterCount = useCallback((count) => {
        const mission = missions.find(m => m.id === 'agua');
        const clamped = Math.min(Math.max(0, count), mission.max);
        const prevCount = missionState.progress['agua'] || 0;
        const wasCompleted = !!missionState.completed['agua'];
        const isNowCompleted = clamped >= mission.max;

        if (isNowCompleted && !wasCompleted) {
            gainXPAmount(mission.xp);
            applyStatBonus(mission.stats);
            setMissionState(prev => ({
                ...prev,
                progress: { ...prev.progress, agua: clamped },
                completed: { ...prev.completed, agua: true },
                xpGainedToday: (prev.xpGainedToday || 0) + mission.xp,
            }));
        } else if (!isNowCompleted && wasCompleted) {
            applyPenalty(mission.xp, null, 0);
            const reversal = {};
            Object.entries(mission.stats).forEach(([key, val]) => { reversal[key] = -val; });
            applyStatBonus(reversal);
            setMissionState(prev => {
                const newCompleted = { ...prev.completed };
                delete newCompleted['agua'];
                return {
                    ...prev,
                    progress: { ...prev.progress, agua: clamped },
                    completed: newCompleted,
                    xpGainedToday: Math.max(0, (prev.xpGainedToday || 0) - mission.xp),
                };
            });
        } else {
            setMissionState(prev => ({
                ...prev,
                progress: { ...prev.progress, agua: clamped },
            }));
        }
    }, [missionState, gainXPAmount, applyPenalty, applyStatBonus]);

    const reportBadHabit = useCallback((habitId) => {
        const habit = BAD_HABITS.find(h => h.id === habitId);
        if (!habit) return;
        applyPenalty(habit.xp, habit.statKey, habit.statLoss);
    }, [applyPenalty]);

    const completedCount = missions.filter(m => {
        if (m.type === 'counter') return (missionState.progress[m.id] || 0) >= m.max;
        return !!missionState.completed[m.id];
    }).length;

    const pendingCount = missions.length - completedCount;

    return (
        <MissionContext.Provider value={{
            missions,
            badHabits: BAD_HABITS,
            missionState,
            toggleMission,
            updateWaterCount,
            reportBadHabit,
            completedCount,
            pendingCount,
        }}>
            {children}
        </MissionContext.Provider>
    );
}

export function useMissions() {
    const ctx = useContext(MissionContext);
    if (!ctx) throw new Error('useMissions must be used within MissionProvider');
    return ctx;
}
