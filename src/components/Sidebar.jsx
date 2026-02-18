import React from 'react';
import { X, Zap } from 'lucide-react';
import { cn } from '../utils/formatters';

const NAV_ITEMS = [
    { id: "chat", icon: "MessageCircle", label: "Chat" },
    { id: "dashboard", icon: "Eye", label: "Visão Orbis" },
    { id: "tarefas", icon: "CheckSquare", label: "Tarefas" },
    { id: "habitos", icon: "Target", label: "Hábitos" },
    { id: "projetos", icon: "Folder", label: "Projetos" },
    { id: "lembretes", icon: "Bell", label: "Lembretes" },
    { id: "financas", icon: "DollarSign", label: "Finanças" },
    { id: "analises", icon: "BarChart3", label: "Análises" },
];

import * as LucideIcons from 'lucide-react';

export function Sidebar({ page, setPage, onClose }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: 260, background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
                <div className="glow-blue" style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={22} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }} className="gradient-text">Orbis</span>
                {onClose && (
                    <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav style={{ flex: 1, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                {NAV_ITEMS.map((item) => {
                    const IconComponent = LucideIcons[item.icon];
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setPage(item.id); onClose?.(); }}
                            className={cn("sidebar-link", page === item.id && "active")}
                        >
                            {IconComponent && <IconComponent size={18} />}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-dim)" }}>
                Orbis v1.0 • Seu universo pessoal
            </div>
        </div>
    );
}
