import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { X, Zap, Download, Upload } from 'lucide-react';
import { cn } from '../utils/formatters';
import { usePlayer } from '../context/PlayerContext';
import { getRank } from '../utils/playerUtils';
import { useMissions } from '../context/MissionContext';

const NAV_ITEMS = [
    { id: "chat",     icon: "MessageCircle", label: "Chat" },
    { id: "dashboard",icon: "Eye",           label: "Status" },
    { id: "missoes",  icon: "Swords",        label: "Missões" },
    { id: "tarefas",  icon: "CheckSquare",   label: "Tarefas" },
    { id: "habitos",  icon: "Target",        label: "Hábitos" },
    { id: "projetos", icon: "Folder",        label: "Projetos" },
    { id: "lembretes",icon: "Bell",          label: "Lembretes" },
    { id: "financas", icon: "DollarSign",    label: "Finanças" },
    { id: "analises", icon: "BarChart3",     label: "Análises" },
];

import * as LucideIcons from 'lucide-react';

function SidebarNav({ page, setPage, onClose }) {
    const { pendingCount } = useMissions();

    return (
        <nav style={{ flex: 1, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            {NAV_ITEMS.map((item) => {
                const IconComponent = LucideIcons[item.icon];
                const showBadge = item.id === 'missoes' && pendingCount > 0;
                return (
                    <button
                        key={item.id}
                        onClick={() => { setPage(item.id); onClose?.(); }}
                        className={cn("sidebar-link", page === item.id && "active")}
                        style={{ position: 'relative' }}
                    >
                        {IconComponent && <IconComponent size={18} />}
                        <span>{item.label}</span>
                        {showBadge && (
                            <span style={{
                                marginLeft: 'auto',
                                minWidth: 18,
                                height: 18,
                                borderRadius: 9,
                                background: '#06b6d4',
                                color: '#050810',
                                fontSize: 10,
                                fontWeight: 800,
                                fontFamily: "'JetBrains Mono', monospace",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                boxShadow: '0 0 8px rgba(6,182,212,0.6)',
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

function PlayerCard() {
    const { player, xpForNextLevel } = usePlayer();
    const { rank, color, glow } = getRank(player.level);
    const xpNeeded = xpForNextLevel(player.level);
    const progress = Math.min((player.xp / xpNeeded) * 100, 100);
    const xpBarRef = useRef(null);

    useEffect(() => {
        if (!xpBarRef.current) return;
        animate(xpBarRef.current, {
            width: `${progress}%`,
            duration: 900,
            easing: 'easeOutExpo',
        });
    }, [progress]);

    return (
        <div style={{
            margin: '0 12px 12px',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(10,15,30,0.9), rgba(15,22,41,0.9))',
            border: `1px solid ${color}33`,
            boxShadow: `0 0 12px ${glow}22`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 2,
                    color, fontFamily: "'JetBrains Mono', monospace",
                    textShadow: `0 0 8px ${glow}`,
                }}>
                    {rank}-RANK
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                    Lv.{player.level}
                </span>
            </div>

            {player.activeTitle && (
                <p style={{ fontSize: 10, color: '#475569', marginBottom: 8, fontStyle: 'italic' }}>
                    [{player.activeTitle}]
                </p>
            )}

            {/* Stats */}
            {player.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
                    {Object.entries(player.stats).map(([key, val]) => (
                        <div key={key} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 8, color: '#334155', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{key}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* XP Bar */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div ref={xpBarRef} style={{
                    height: '100%', width: `${progress}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                    boxShadow: `0 0 6px ${glow}`,
                    borderRadius: 4,
                }} />
            </div>
            <p style={{ fontSize: 9, color: '#334155', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                {player.xp} / {xpNeeded} XP
            </p>
        </div>
    );
}

const DATA_KEYS = ['orbis_tasks', 'orbis_habits', 'orbis_projects', 'orbis_reminders', 'orbis_finances', 'orbis_player'];

function DataBackup() {
    const importRef = useRef(null);

    const handleExport = () => {
        const backup = {};
        DATA_KEYS.forEach(k => {
            const val = localStorage.getItem(k);
            if (val) backup[k] = JSON.parse(val);
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `the-system-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                DATA_KEYS.forEach(k => {
                    if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
                });
                window.location.reload();
            } catch {
                alert('Arquivo inválido.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div style={{ padding: "8px 12px", display: "flex", gap: 6 }}>
            <button
                onClick={handleExport}
                title="Exportar backup"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", color: "#06b6d4", cursor: "pointer", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            >
                <Download size={13} /> EXPORT
            </button>
            <button
                onClick={() => importRef.current?.click()}
                title="Importar backup"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", color: "#06b6d4", cursor: "pointer", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            >
                <Upload size={13} /> IMPORT
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
        </div>
    );
}

export function Sidebar({ page, setPage, onClose }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: 260, background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
                <div className="glow-cyan" style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={22} color="white" />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: "#06b6d4", textShadow: "0 0 12px rgba(6,182,212,0.5)" }}>THE SYSTEM</span>
                {onClose && (
                    <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <SidebarNav page={page} setPage={setPage} onClose={onClose} />

            <PlayerCard />
            <DataBackup />
            <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-dim)" }}>
                THE SYSTEM v1.0 • ONLINE
            </div>
        </div>
    );
}
