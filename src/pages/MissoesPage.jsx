import React, { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Minus, AlertTriangle, Zap, Shield, Brain, Wind, Eye } from 'lucide-react';
import { useMissions } from '../context/MissionContext';
import { usePlayer } from '../context/PlayerContext';
import { SystemWindow } from '../components/SystemWindow';

const STAT_CONFIG = {
    STR: { icon: Zap,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  label: 'STR', name: 'Força' },
    VIT: { icon: Shield, color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  label: 'VIT', name: 'Vitalidade' },
    INT: { icon: Brain,  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', label: 'INT', name: 'Inteligência' },
    AGI: { icon: Wind,   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'AGI', name: 'Agilidade' },
    SEN: { icon: Eye,    color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', label: 'SEN', name: 'Sensibilidade' },
};

export function MissoesPage() {
    const { missions, badHabits, missionState, toggleMission, updateWaterCount, reportBadHabit, completedCount } = useMissions();
    const { player } = usePlayer();
    const [xpFlashes, setXpFlashes] = useState({});
    const [penaltyFlashes, setPenaltyFlashes] = useState({});
    const [missionsParent] = useAutoAnimate();

    const stats = { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0, ...player.stats };

    const today = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const handleMissionToggle = (mission) => {
        if (mission.type === 'counter') return;
        const wasCompleted = !!missionState.completed[mission.id];
        toggleMission(mission.id);
        if (!wasCompleted) {
            setXpFlashes(prev => ({ ...prev, [mission.id]: Date.now() }));
            setTimeout(() => setXpFlashes(prev => {
                const next = { ...prev };
                delete next[mission.id];
                return next;
            }), 1800);
        }
    };

    const handleBadHabit = (habit) => {
        reportBadHabit(habit.id);
        const key = habit.id + '_' + Date.now();
        setPenaltyFlashes(prev => ({ ...prev, [key]: { id: habit.id, xp: habit.xp } }));
        setTimeout(() => setPenaltyFlashes(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        }), 1800);
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* ── Header ── */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h1 style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 22,
                        fontWeight: 800,
                        color: '#06b6d4',
                        textShadow: '0 0 24px rgba(6,182,212,0.5)',
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                    }}>
                        [ THE SYSTEM ]
                    </h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '5px 14px',
                        borderRadius: 20,
                        background: 'rgba(6,182,212,0.08)',
                        border: '1px solid rgba(6,182,212,0.3)',
                    }}>
                        <div style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#06b6d4',
                            boxShadow: '0 0 8px #06b6d4',
                            animation: 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
                        }} />
                        <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 2,
                            color: '#06b6d4',
                        }}>
                            SISTEMA ATIVO
                        </span>
                    </div>
                </div>
                <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: '#475569',
                    letterSpacing: 1,
                }}>
                    {today.toUpperCase()}
                </p>
            </div>

            {/* ── Player Stats ── */}
            <SystemWindow title="Atributos do Caçador" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {Object.entries(STAT_CONFIG).map(([key, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                            <div key={key} style={{
                                flex: '1 1 80px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '14px 8px',
                                background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                borderRadius: 10,
                            }}>
                                <Icon size={18} color={cfg.color} style={{ marginBottom: 6 }} />
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 22,
                                    fontWeight: 800,
                                    color: cfg.color,
                                    lineHeight: 1,
                                    marginBottom: 4,
                                }}>
                                    {stats[key]}
                                </span>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 9,
                                    color: '#475569',
                                    letterSpacing: 1.5,
                                }}>
                                    {cfg.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </SystemWindow>

            {/* ── Daily Missions ── */}
            <SystemWindow title="Missões do Dia" style={{ marginBottom: 16 }}>
                <div ref={missionsParent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {missions.map(mission => {
                        const isCompleted = mission.type === 'counter'
                            ? (missionState.progress[mission.id] || 0) >= mission.max
                            : !!missionState.completed[mission.id];
                        const waterCount = mission.type === 'counter'
                            ? (missionState.progress[mission.id] || 0)
                            : 0;
                        const hasFlash = !!xpFlashes[mission.id];

                        return (
                            <div key={mission.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 14px',
                                borderRadius: 8,
                                background: isCompleted ? 'rgba(6,182,212,0.07)' : 'rgba(255,255,255,0.02)',
                                border: isCompleted ? '1px solid rgba(6,182,212,0.28)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'visible',
                            }}>
                                {/* Control: checkbox or counter */}
                                {mission.type === 'boolean' ? (
                                    <button
                                        onClick={() => handleMissionToggle(mission)}
                                        style={{
                                            flexShrink: 0,
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            border: isCompleted ? '2px solid #06b6d4' : '2px solid rgba(255,255,255,0.18)',
                                            background: isCompleted ? '#06b6d4' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isCompleted ? '0 0 12px rgba(6,182,212,0.45)' : 'none',
                                            padding: 0,
                                        }}
                                    >
                                        {isCompleted && <Check size={15} color="white" strokeWidth={3} />}
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <button
                                            onClick={() => updateWaterCount(waterCount - 1)}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 4,
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                background: 'rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                padding: 0,
                                            }}
                                        >
                                            <Minus size={11} />
                                        </button>
                                        <span style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: isCompleted ? '#06b6d4' : '#94a3b8',
                                            minWidth: 34,
                                            textAlign: 'center',
                                        }}>
                                            {waterCount}/{mission.max}
                                        </span>
                                        <button
                                            onClick={() => updateWaterCount(waterCount + 1)}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 4,
                                                border: '1px solid rgba(6,182,212,0.3)',
                                                background: 'rgba(6,182,212,0.1)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#06b6d4',
                                                padding: 0,
                                            }}
                                        >
                                            <Plus size={11} />
                                        </button>
                                    </div>
                                )}

                                {/* Mission info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: isCompleted ? '#06b6d4' : '#cbd5e1',
                                        textDecoration: isCompleted && mission.type === 'boolean' ? 'line-through' : 'none',
                                        opacity: isCompleted && mission.type === 'boolean' ? 0.65 : 1,
                                        letterSpacing: 0.5,
                                    }}>
                                        {mission.label.toUpperCase()}
                                    </span>
                                    {mission.type === 'counter' && (
                                        <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${(waterCount / mission.max) * 100}%`,
                                                background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                                                boxShadow: '0 0 6px rgba(6,182,212,0.6)',
                                                borderRadius: 4,
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </div>
                                    )}
                                </div>

                                {/* Reward info */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        color: '#06b6d4',
                                        fontWeight: 700,
                                    }}>
                                        +{mission.xp} XP
                                    </div>
                                    <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>
                                        {Object.entries(mission.stats).map(([k, v]) => `${k}+${v}`).join(' ')}
                                    </div>
                                </div>

                                {/* XP gain flash */}
                                <AnimatePresence>
                                    {hasFlash && (
                                        <motion.div
                                            key={xpFlashes[mission.id]}
                                            initial={{ opacity: 1, y: 0, x: '-50%' }}
                                            animate={{ opacity: 0, y: -36 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.4, ease: 'easeOut' }}
                                            style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: '50%',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontWeight: 800,
                                                fontSize: 14,
                                                color: '#06b6d4',
                                                textShadow: '0 0 12px #06b6d4',
                                                pointerEvents: 'none',
                                                zIndex: 20,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            +{mission.xp} XP
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </SystemWindow>

            {/* ── Bad Habits ── */}
            <SystemWindow title="Reportar Hábito Ruim" style={{ marginBottom: 16 }}>
                <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: '#475569',
                    letterSpacing: 1,
                    marginBottom: 12,
                }}>
                    ATENÇÃO: ESTAS AÇÕES APLICAM PENALIDADES IMEDIATAMENTE
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {badHabits.map(habit => (
                        <div key={habit.id} style={{ position: 'relative' }}>
                            <button
                                onClick={() => handleBadHabit(habit)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: '10px 13px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    background: 'rgba(239,68,68,0.04)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                                    <AlertTriangle size={13} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                                    <span style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                        letterSpacing: 0.5,
                                        lineHeight: 1.4,
                                    }}>
                                        {habit.label.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        color: '#ef4444',
                                        fontWeight: 700,
                                    }}>
                                        -{habit.xp} XP
                                    </div>
                                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                        {habit.statKey}-{habit.statLoss}
                                    </div>
                                </div>
                            </button>

                            {/* Penalty flash */}
                            <AnimatePresence>
                                {Object.entries(penaltyFlashes)
                                    .filter(([, v]) => v.id === habit.id)
                                    .map(([key, v]) => (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 1, y: 0, x: '-50%' }}
                                            animate={{ opacity: 0, y: -36 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.4, ease: 'easeOut' }}
                                            style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: '50%',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontWeight: 800,
                                                fontSize: 14,
                                                color: '#ef4444',
                                                textShadow: '0 0 12px #ef4444',
                                                pointerEvents: 'none',
                                                zIndex: 20,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            -{v.xp} XP
                                        </motion.div>
                                    ))
                                }
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </SystemWindow>

            {/* ── Footer ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(5,8,16,0.7)',
                border: '1px solid rgba(6,182,212,0.14)',
            }}>
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: '#475569',
                }}>
                    MISSÕES CONCLUÍDAS:{' '}
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>
                        {completedCount}/{missions.length}
                    </span>
                </span>
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: '#475569',
                }}>
                    XP GANHO HOJE:{' '}
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>
                        +{missionState.xpGainedToday || 0}
                    </span>
                </span>
            </div>
        </div>
    );
}
