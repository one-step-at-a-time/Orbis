import React, { useEffect } from 'react';
import ConfettiBoom from 'react-confetti-boom';
import { usePlayer } from '../context/PlayerContext';

export function LevelUpModal() {
    const { levelUpData, dismissLevelUp } = usePlayer();

    useEffect(() => {
        if (levelUpData) {
            const t = setTimeout(dismissLevelUp, 6000);
            return () => clearTimeout(t);
        }
    }, [levelUpData]);

    if (!levelUpData) return null;

    const { newLevel, newRank, newTitles, xpGained } = levelUpData;

    return (
        <div onClick={dismissLevelUp} style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            animation: 'fadeIn 0.3s ease',
        }}>
            <ConfettiBoom
                x={0.5}
                y={0.4}
                particleCount={120}
                deg={270}
                shapeSize={10}
                spreadDeg={60}
                effectInterval={3000}
                effectCount={1}
                colors={[newRank.color, '#06b6d4', '#38bdf8', '#f59e0b', '#a855f7', '#22c55e']}
            />
            <div onClick={e => e.stopPropagation()} style={{
                background: 'linear-gradient(135deg, #0a0f1e, #0f1629)',
                border: `1px solid ${newRank.color}`,
                borderRadius: 16,
                padding: '40px 48px',
                textAlign: 'center',
                maxWidth: 420,
                width: '90%',
                boxShadow: `0 0 60px ${newRank.glow}, 0 0 120px ${newRank.glow}33`,
                animation: 'systemWindow 0.4s ease',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Scan line effect */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)',
                }} />

                <p style={{ fontSize: 11, letterSpacing: 4, color: newRank.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 16, textTransform: 'uppercase' }}>
                    — Sistema —
                </p>

                <div style={{
                    fontSize: 64, fontWeight: 900, lineHeight: 1,
                    color: newRank.color,
                    textShadow: `0 0 20px ${newRank.glow}, 0 0 40px ${newRank.glow}`,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 8,
                }}>
                    {newLevel}
                </div>

                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, fontFamily: "'JetBrains Mono', monospace" }}>
                    LEVEL UP
                </p>

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: `${newRank.color}18`,
                    border: `1px solid ${newRank.color}44`,
                    borderRadius: 8, padding: '8px 20px', marginBottom: 24,
                }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: newRank.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {newRank.rank}-Rank
                    </span>
                </div>

                {newTitles.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>
                            Novo Título Obtido
                        </p>
                        {newTitles.map(t => (
                            <div key={t} style={{
                                fontSize: 16, fontWeight: 700, color: '#f1f5f9',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8, padding: '8px 16px', marginBottom: 6,
                            }}>
                                [{t}]
                            </div>
                        ))}
                    </div>
                )}

                <p style={{ fontSize: 12, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                    +{xpGained} XP
                </p>

                <p style={{ fontSize: 11, color: '#334155', marginTop: 20 }}>
                    Clique para fechar
                </p>
            </div>

            <style>{`
                @keyframes systemWindow {
                    from { opacity: 0; transform: scale(0.85); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
