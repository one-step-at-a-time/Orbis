import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const PlayerContext = createContext(null);

const TITLES = [
    { level: 1,  title: "O Desperto" },
    { level: 3,  title: "Caçador Iniciante" },
    { level: 5,  title: "Sobrevivente das Trevas" },
    { level: 8,  title: "Invocador de Sombras" },
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

export function getRank(level) {
    if (level >= 71) return { rank: 'Nacional', color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' };
    if (level >= 51) return { rank: 'S',        color: '#ef4444', glow: 'rgba(239,68,68,0.5)' };
    if (level >= 36) return { rank: 'A',        color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' };
    if (level >= 21) return { rank: 'B',        color: '#a855f7', glow: 'rgba(168,85,247,0.5)' };
    if (level >= 11) return { rank: 'C',        color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' };
    if (level >= 6)  return { rank: 'D',        color: '#22c55e', glow: 'rgba(34,197,94,0.5)' };
    return              { rank: 'E',        color: '#9ca3af', glow: 'rgba(156,163,175,0.5)' };
}

function xpForNextLevel(level) {
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
};

export function PlayerProvider({ children }) {
    const [player, setPlayer] = useLocalStorage('orbis_player', INITIAL_PLAYER);
    const [levelUpData, setLevelUpData] = useState(null); // { newLevel, newRank, newTitles }

    const gainXP = useCallback((priority) => {
        const amount = XP_TABLE[priority] || XP_TABLE.media;

        setPlayer(prev => {
            let { level, xp, totalXp, titles, activeTitle } = prev;
            xp += amount;
            totalXp += amount;

            let newTitles = [];
            let levelsGained = 0;

            while (xp >= xpForNextLevel(level)) {
                xp -= xpForNextLevel(level);
                const gained = getNewTitles(level, level + 1);
                newTitles = [...newTitles, ...gained];
                level += 1;
                levelsGained += 1;
            }

            const allTitles = getTitlesEarned(level);
            const updatedActiveTitle = newTitles.length > 0 ? newTitles[newTitles.length - 1] : activeTitle;

            if (levelsGained > 0) {
                setTimeout(() => {
                    setLevelUpData({
                        newLevel: level,
                        newRank: getRank(level),
                        newTitles,
                        xpGained: amount,
                    });
                }, 300);
            }

            return { level, xp, totalXp, titles: allTitles, activeTitle: updatedActiveTitle };
        });
    }, [setPlayer]);

    const dismissLevelUp = useCallback(() => setLevelUpData(null), []);

    const setActiveTitle = useCallback((title) => {
        setPlayer(prev => ({ ...prev, activeTitle: title }));
    }, [setPlayer]);

    return (
        <PlayerContext.Provider value={{ player, gainXP, levelUpData, dismissLevelUp, setActiveTitle, xpForNextLevel, getRank }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
