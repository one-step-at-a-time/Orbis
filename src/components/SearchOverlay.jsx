import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CheckSquare, Target, Folder, DollarSign, Bell, ArrowRight } from 'lucide-react';
import { useAppData } from '../context/DataContext';

export function SearchOverlay({ isOpen, onClose, setPage }) {
    const { tasks, habits, projects, reminders, finances } = useAppData();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const q = query.toLowerCase();
        const filtered = [
            ...tasks.filter(t => t.titulo.toLowerCase().includes(q)).map(t => ({ ...t, type: 'tarefa', icon: CheckSquare, page: 'tarefas' })),
            ...habits.filter(h => h.titulo.toLowerCase().includes(q)).map(h => ({ ...h, type: 'hábito', icon: Target, page: 'habitos' })),
            ...projects.filter(p => p.titulo.toLowerCase().includes(q)).map(p => ({ ...p, type: 'projeto', icon: Folder, page: 'projetos' })),
            ...reminders.filter(r => r.titulo.toLowerCase().includes(q)).map(r => ({ ...r, type: 'lembrete', icon: Bell, page: 'lembretes' })),
            ...finances.filter(f => f.descricao.toLowerCase().includes(q)).map(f => ({ ...f, type: 'finanças', icon: DollarSign, page: 'financas', titulo: f.descricao })),
        ].slice(0, 8);

        setResults(filtered);
    }, [query, tasks, habits, projects, reminders, finances]);

    if (!isOpen) return null;

    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", padding: "80px 20px" }}
            onClick={onClose}
        >
            <div
                className="card animate-slide-up"
                style={{ width: "100%", maxWidth: 600, height: "fit-content", background: "var(--bg-card)", border: "1px solid var(--border)", padding: 0, overflow: "hidden" }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
                    <Search size={22} color="var(--primary)" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar tarefas, projetos, finanças..."
                        style={{ border: "none", background: "none", fontSize: 18, padding: 0, width: "100%", outline: "none" }}
                    />
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {results.length > 0 ? (
                        <div style={{ padding: "8px 0" }}>
                            {results.map((res, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setPage(res.page); onClose(); }}
                                    style={{ width: "100%", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                                    onMouseOver={e => e.currentTarget.style.background = "rgba(59,130,246,0.1)"}
                                    onMouseOut={e => e.currentTarget.style.background = "none"}
                                >
                                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(17,24,39,0.4)" }}>
                                        <res.icon size={18} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{res.titulo}</p>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{res.type}</span>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-dim)" />
                                </button>
                            ))}
                        </div>
                    ) : query.trim() ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                            Nenhum resultado encontrado para "{query}"
                        </div>
                    ) : (
                        <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                            Digite algo para começar a buscar...
                        </div>
                    )}
                </div>

                <div style={{ padding: "12px 20px", background: "rgba(17,24,39,0.4)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-dim)" }}>
                    <span>Pressione <b>ESC</b> para fechar</span>
                    <span>The System IntelliSearch™</span>
                </div>
            </div>
        </div>
    );
}
