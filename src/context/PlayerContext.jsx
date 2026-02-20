import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getRank } from '../utils/playerUtils';

const PlayerContext = createContext(null);

const TITLES = [
    { level: 1, title: "O Desperto" },
    { level: 3, title: "Caçador Iniciante" },
    { level: 5, title: "Sobrevivente das Trevas" },
    { level: 8, title: "Invocador de Sombras" },
    { level: 10, title: "Arise" },
    { level: 15, title: "Soldado das Sombras" },
    { level: 20, title: "Comandante das Sombras" },
    { level: 25, title: "General das Sombras" },
    { level: 30, title: "Marechal das Sombras" },
    { level: 40, title: "O Mais Forte do Mundo" },
    { level: 50, title: "Monarca das Sombras" },
    { level: 70, title: "Rei das Sombras" },
];

const XP_TABLE = {
    baixa: 50,
    media: 100,
    alta: 200,
};

export function xpForNextLevel(level) {
    return level * 150;
}

function getTitlesEarned(level) {
    return TITLES.filter(t => t.level <= level).map(t => t.title);
}

function getNewTitles(oldLevel, newLevel) {
    return TITLES.filter(t => t.level > oldLevel && t.level <= newLevel).map(t => t.title);
}

const INITIAL_PLAYER = {
    level: 1,
    xp: 0,
    totalXp: 0,
    titles: ["O Desperto"],
    activeTitle: "O Desperto",
    stats: { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0 },
};

// Lógica central de progressão de XP — usada por gainXP e gainXPAmount
function computeXpGain(prev, amount) {
    let { level, xp, totalXp, titles, activeTitle, stats } = prev;
    xp += amount;
    totalXp += amount;

    let newTitles = [];

    while (xp >= xpForNextLevel(level)) {
        xp -= xpForNextLevel(level);
        const gained = getNewTitles(level, level + 1);
        newTitles = [...newTitles, ...gained];
        level += 1;
    }

    const allTitles = getTitlesEarned(level);
    const updatedActiveTitle = newTitles.length > 0 ? newTitles[newTitles.length - 1] : activeTitle;

    return {
        next: {
            level,
            xp,
            totalXp,
            titles: allTitles,
            activeTitle: updatedActiveTitle,
            stats: stats || { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0 },
        },
        levelsGained: level - prev.level,
        newTitles,
        amount,
    };
}

export function PlayerProvider({ children }) {
    const [player, setPlayer] = useLocalStorage('orbis_player', INITIAL_PLAYER);
    const [levelUpData, setLevelUpData] = useState(null);

    // gainXP aceita uma prioridade ('baixa'|'media'|'alta')
    const gainXP = useCallback((priority) => {
        const amount = XP_TABLE[priority] || XP_TABLE.media;
        gainXPAmount(amount);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // gainXPAmount aceita um valor numérico direto
    const gainXPAmount = useCallback((amount) => {
        setPlayer(prev => {
            const result = computeXpGain(prev, amount);

            // useState setter fora do updater: seguro pois é efeito derivado do mesmo ciclo
            if (result.levelsGained > 0) {
                // Agendar fora do updater para evitar side-effect dentro do setState
                queueMicrotask(() => {
                    setLevelUpData({
                        newLevel: result.next.level,
                        newRank: getRank(result.next.level),
                        newTitles: result.newTitles,
                        xpGained: result.amount,
                    });
                });
            }

            return result.next;
        });
    }, [setPlayer]);

    const applyPenalty = useCallback((xpLoss, statKey, statLoss) => {
        setPlayer(prev => {
            const currentStats = { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0, ...prev.stats };
            const newStats = { ...currentStats };
            if (statKey && statLoss) {
                newStats[statKey] = Math.max(0, (newStats[statKey] || 0) - statLoss);
            }
            return {
                ...prev,
                xp: Math.max(0, prev.xp - xpLoss),
                totalXp: Math.max(0, prev.totalXp - xpLoss),
                stats: newStats,
            };
        });
    }, [setPlayer]);

    const applyStatBonus = useCallback((statChanges) => {
        setPlayer(prev => {
            const newStats = { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0, ...prev.stats };
            Object.entries(statChanges).forEach(([key, val]) => {
                newStats[key] = Math.max(0, (newStats[key] || 0) + val);
            });
            return { ...prev, stats: newStats };
        });
    }, [setPlayer]);

    const dismissLevelUp = useCallback(() => setLevelUpData(null), []);

    const setActiveTitle = useCallback((title) => {
        setPlayer(prev => ({ ...prev, activeTitle: title }));
    }, [setPlayer]);

    return (
        <PlayerContext.Provider value={{ player, gainXP, gainXPAmount, applyPenalty, applyStatBonus, levelUpData, dismissLevelUp, setActiveTitle, xpForNextLevel, getRank }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
