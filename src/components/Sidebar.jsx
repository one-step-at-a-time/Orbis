// SOVEREIGN NEXUS — Command Center (Sidebar)
import React, { useRef, useEffect, useState } from 'react';
import { animate } from 'animejs';
import { X, Zap, Download, Upload } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../utils/formatters';
import { usePlayer } from '../context/PlayerContext';
import { getRank } from '../utils/playerUtils';
import { useMissions } from '../context/MissionContext';
import { Spotlight, TypewriterText, CornerBrackets } from './AceternityUI';

const NAV_ITEMS = [
    { id: "chat", icon: "MessageCircle", label: "Chat", code: "CH" },
    { id: "dashboard", icon: "Eye", label: "Status", code: "ST" },
    { id: "missoes", icon: "Swords", label: "Missões", code: "MS" },
    { id: "tarefas", icon: "CheckSquare", label: "Tarefas", code: "TK" },
    { id: "habitos", icon: "Target", label: "Hábitos", code: "HB" },
    { id: "projetos", icon: "Folder", label: "Projetos", code: "PJ" },
    { id: "lembretes", icon: "Bell", label: "Lembretes", code: "LB" },
    { id: "financas", icon: "DollarSign", label: "Finanças", code: "FN" },
    { id: "analises", icon: "BarChart3", label: "Análises", code: "AN" },
];

function SidebarNav({ page, setPage, onClose }) {
    const { pendingCount } = useMissions();

    return (
        <nav style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
            {/* Nav label */}
            <div style={{ padding: "4px 4px 8px", marginBottom: 2 }}>
                <span style={{ fontSize: 9, fontFamily: "var(--font-system)", letterSpacing: "0.18em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    ── MODULES ──
                </span>
            </div>

            {NAV_ITEMS.map((item, idx) => {
                const IconComponent = LucideIcons[item.icon];
                const showBadge = item.id === 'missoes' && pendingCount > 0;
                const isActive = page === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => { setPage(item.id); onClose?.(); }}
                        className={cn("sidebar-link", isActive && "active")}
                        style={{
                            animation: `hud-boot 0.4s ease-out both`,
                            animationDelay: `${idx * 40}ms`,
                        }}
                    >
                        {/* Module code */}
                        <span style={{
                            fontSize: 8, fontFamily: "var(--font-system)", color: isActive ? "var(--primary)" : "var(--text-dim)",
                            minWidth: 18, letterSpacing: "0.05em", opacity: 0.6,
                        }}>
                            {item.code}
                        </span>

                        {IconComponent && (
                            <IconComponent size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>

                        {showBadge && (
                            <span style={{
                                marginLeft: "auto", minWidth: 17, height: 17, borderRadius: "50%",
                                background: "var(--primary)", color: "var(--bg-void)",
                                fontSize: 9, fontWeight: 800, fontFamily: "var(--font-system)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 0 10px rgba(0,240,255,0.7)",
                                animation: "pulse-ring 2s ease-in-out infinite",
                            }}>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

function OperatorPanel() {
    const { player, xpForNextLevel } = usePlayer();
    const { rank, color, glow } = getRank(player.level);
    const xpNeeded = xpForNextLevel(player.level);
    const progress = Math.min((player.xp / xpNeeded) * 100, 100);
    const xpBarRef = useRef(null);

    useEffect(() => {
        if (!xpBarRef.current) return;
        animate(xpBarRef.current, { width: `${progress}%`, duration: 1000, easing: 'easeOutExpo' });
    }, [progress]);

    return (
        <div style={{ margin: "0 10px 10px", position: "relative" }}>
            {/* Panel */}
            <div style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,5,6,0.98), rgba(0,10,12,0.98))",
                border: `1px solid ${color}30`,
                boxShadow: `0 0 24px ${glow}18, inset 0 1px 0 rgba(255,255,255,0.03)`,
                position: "relative", overflow: "hidden",
            }}>
                <CornerBrackets color={color + "80"} size={8} animated />

                {/* Rank radial glow */}
                <div style={{
                    position: "absolute", top: -30, right: -20, width: 100, height: 100,
                    borderRadius: "50%", background: `radial-gradient(circle, ${glow}20, transparent 70%)`,
                    pointerEvents: "none",
                }} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 8, fontFamily: "var(--font-system)", letterSpacing: "0.18em", color: "var(--text-dim)", marginBottom: 2 }}>
                            OPERATOR STATUS
                        </div>
                        <div style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
                            color, fontFamily: "var(--font-system)",
                            textShadow: `0 0 12px ${glow}`,
                        }}>
                            {rank}-RANK
                        </div>
                    </div>
                    <div style={{
                        fontFamily: "var(--font-system)", fontSize: 18, fontWeight: 700, color,
                        textShadow: `0 0 16px ${glow}`, letterSpacing: "-0.02em",
                    }}>
                        {player.level.toString().padStart(2, "0")}
                    </div>
                </div>

                {player.activeTitle && (
                    <div style={{
                        fontSize: 9, color: "var(--text-dim)", marginBottom: 8,
                        fontFamily: "var(--font-system)", letterSpacing: "0.08em",
                    }}>
                        [ {player.activeTitle} ]
                    </div>
                )}

                {/* Stats grid */}
                {player.stats && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginBottom: 10 }}>
                        {Object.entries(player.stats).map(([key, val]) => (
                            <div key={key} style={{ textAlign: "center", padding: "4px 0", background: "rgba(0,240,255,0.03)", borderRadius: 0, border: "1px solid rgba(0,240,255,0.08)" }}>
                                <div style={{ fontSize: 7, color: "var(--text-dim)", fontFamily: "var(--font-system)", letterSpacing: 1 }}>{key}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "var(--font-system)" }}>{val}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* XP Energy Bar */}
                <div style={{ marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 8, fontFamily: "var(--font-system)", color: "var(--text-dim)", letterSpacing: "0.1em" }}>ENERGY / XP</span>
                        <span style={{ fontSize: 8, fontFamily: "var(--font-system)", color }}>
                            {player.xp}<span style={{ color: "var(--text-dim)" }}>/{xpNeeded}</span>
                        </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                        <div ref={xpBarRef} style={{
                            height: "100%", width: `${progress}%`,
                            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                            boxShadow: `0 0 8px ${glow}`,
                            borderRadius: 3,
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const DATA_KEYS = ['orbis_tasks', 'orbis_habits', 'orbis_projects', 'orbis_reminders', 'orbis_finances', 'orbis_player'];

function DataBackup() {
    const importRef = useRef(null);

    const handleExport = () => {
        const backup = {};
        DATA_KEYS.forEach(k => { const val = localStorage.getItem(k); if (val) backup[k] = JSON.parse(val); });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `the-system-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                DATA_KEYS.forEach(k => { if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k])); });
                window.location.reload();
            } catch { alert('Arquivo inválido.'); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    return (
        <div style={{ padding: "6px 10px", display: "flex", gap: 6 }}>
            {[{ label: "EXPORT", icon: <Download size={11} />, fn: handleExport }, { label: "IMPORT", icon: <Upload size={11} />, fn: () => importRef.current?.click() }].map(({ label, icon, fn }) => (
                <button key={label} onClick={fn} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 5, padding: "6px 0", borderRadius: 0,
                    clipPath: "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)",
                    background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.18)",
                    color: "var(--primary)", cursor: "pointer", fontSize: 9,
                    fontFamily: "var(--font-interface)", letterSpacing: "0.12em", textTransform: "uppercase",
                    transition: "all 0.18s",
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,240,255,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                    {icon} {label}
                </button>
            ))}
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
        </div>
    );
}

export function Sidebar({ page, setPage, onClose }) {
    const [booted, setBooted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setBooted(true), 100); return () => clearTimeout(t); }, []);

    return (
        <div style={{
            display: "flex", flexDirection: "column", height: "100%", width: 240,
            background: "linear-gradient(180deg, #030303 0%, #000000 60%, #000000 100%)",
            borderRight: "1px solid rgba(0, 240, 255, 0.1)",
            position: "relative", overflow: "hidden",
        }}>
            <Spotlight fill="rgba(0, 240, 255, 0.06)" />

            {/* Top energy line */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "1px",
                background: "linear-gradient(90deg, transparent, #00F0FF, transparent)",
                opacity: 0.7,
                boxShadow: "0 0 8px rgba(0,240,255,0.5)",
            }} />

            {/* Subtle top gradient */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 140,
                background: "linear-gradient(180deg, rgba(0,240,255,0.05) 0%, transparent 100%)",
                pointerEvents: "none",
            }} />

            {/* BOTTOM GRADIENT — visibility for lower buttons */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 180,
                background: "linear-gradient(to top, rgba(0,240,255,0.15) 0%, rgba(0,240,255,0.06) 40%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 0,
            }} />

            {/* Logo — Command Center Header */}
            <div style={{
                padding: "18px 16px 14px",
                borderBottom: "1px solid rgba(0,240,255,0.08)",
                position: "relative", zIndex: 1,
                display: "flex", alignItems: "center", gap: 10,
            }}>
                {/* Zap icon with moving border */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                        width: 36, height: 36,
                        clipPath: "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)",
                        background: "linear-gradient(135deg, #00F0FF, #007888)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 20px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.2)",
                    }}>
                        <Zap size={18} color="#000000" strokeWidth={2.5} />
                    </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 7, fontFamily: "var(--font-system)", letterSpacing: "0.25em", color: "rgba(0,240,255,0.4)", marginBottom: 3, textTransform: "uppercase" }}>
                        SOVEREIGN NEXUS
                    </div>
                    <div style={{
                        fontFamily: "var(--font-system)", fontWeight: 700, fontSize: 13,
                        letterSpacing: "0.15em", color: "#00F0FF",
                        textShadow: "0 0 16px rgba(0,240,255,0.7), 0 0 30px rgba(0,240,255,0.3)",
                    }}>
                        {booted ? (
                            <TypewriterText text="THE SYSTEM" speed={55} />
                        ) : ""}
                    </div>
                </div>

                {onClose && (
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <SidebarNav page={page} setPage={setPage} onClose={onClose} />
                <OperatorPanel />
                <DataBackup />

                {/* Footer */}
                <div style={{
                    padding: "8px 16px", borderTop: "1px solid rgba(0,240,255,0.07)",
                    display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1,
                }}>
                    <span style={{
                        width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                        background: "var(--success)", boxShadow: "0 0 8px rgba(0,255,157,0.9)",
                        animation: "system-pulse 2.5s ease-in-out infinite",
                    }} />
                    <span style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-system)", letterSpacing: "0.1em" }}>
                        SYS v1.0 • ONLINE
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-system)" }}>
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                </div>
            </div>
        </div>
    );
}
