import React, { useState } from 'react';
import { Target, Flame, CheckCircle2, TrendingUp, Check, Plus, Trash2 } from 'lucide-react';
import { StatsCard, ProgressBar } from '../components/Common';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewHabitModal } from '../components/Modals';
import { useAppData } from '../context/DataContext';

export function HabitosPage() {
    const { habits, addHabitLog, deleteHabit } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const todayStr = new Date().toISOString().split('T')[0];

    const completedToday = habits.filter(h => h.logs.some(l => l.data === todayStr)).length;
    const monthRate = habits.reduce((a, h) => a + h.metaMensal, 0) > 0
        ? Math.round(habits.reduce((a, h) => a + h.logs.length, 0) / habits.reduce((a, h) => a + h.metaMensal, 0) * 100)
        : 0;

    // Calcular streak real: dias consecutivos com pelo menos 1 hábito feito
    const streak = (() => {
        if (habits.length === 0) return 0;
        const allDates = new Set(habits.flatMap(h => h.logs.map(l => l.data)));
        let count = 0;
        const d = new Date();
        // Se não completou nada hoje, começa verificando ontem
        const checkStr = d.toISOString().split('T')[0];
        if (!allDates.has(checkStr)) d.setDate(d.getDate() - 1);
        while (true) {
            const s = d.toISOString().split('T')[0];
            if (!allDates.has(s)) break;
            count++;
            d.setDate(d.getDate() - 1);
        }
        return count;
    })();

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const firstDay = new Date(year, month, 1).getDay();
    const monthLabel = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="HÁBITOS" subtitle="CONSTRUINDO DISCIPLINA DIÁRIA" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> Novo Hábito
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <StatsCard title="Total de Hábitos" value={habits.length} icon={Target} iconColor="var(--primary)" bgColor="rgba(59,130,246,0.1)" />
                <StatsCard title="Sequência" value={`${streak} dia${streak !== 1 ? 's' : ''}`} icon={Flame} iconColor="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
                <StatsCard title="Completos Hoje" value={`${completedToday}/${habits.length}`} icon={CheckCircle2} iconColor="#22c55e" bgColor="rgba(34,197,94,0.1)" />
                <StatsCard title="Taxa do Mês" value={`${monthRate}%`} icon={TrendingUp} iconColor="#06b6d4" bgColor="rgba(6,182,212,0.1)" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 16, textTransform: 'capitalize' }}>Calendário — {monthLabel}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                        {weekdays.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", padding: "6px 0" }}>{d}</div>)}
                        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                        {daysArray.map(day => {
                            const isToday = day === today.getDate();
                            return (
                                <div key={day} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: isToday ? 700 : 400, background: isToday ? "var(--primary)" : "var(--bg-secondary)", color: isToday ? "white" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}>
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Meus Hábitos</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {habits.map(h => {
                            const done = h.logs.some(l => l.data === todayStr);
                            const progress = h.metaMensal > 0 ? Math.min((h.logs.length / h.metaMensal) * 100, 100) : 0;
                            return (
                                <div key={h.id} className="card" style={{ padding: 14 }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                        <button onClick={() => addHabitLog(h.id, todayStr)} style={{ width: 32, height: 32, borderRadius: "50%", border: done ? "none" : "1px solid var(--border)", background: done ? "#22c55e" : "var(--bg-secondary)", color: done ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
                                            <Check size={14} />
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{h.icone} {h.titulo}</span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    {done && <Flame size={14} color="#f59e0b" />}
                                                    <button
                                                        className="btn-ghost"
                                                        onClick={() => deleteHabit(h.id)}
                                                        title="Excluir hábito"
                                                        style={{ padding: 4, color: "var(--text-dim)" }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                            {h.descricao && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{h.descricao}</p>}
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{h.logs.length} / {h.metaMensal} este mês</span>
                                                    <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{Math.round(progress)}%</span>
                                                </div>
                                                <ProgressBar value={progress} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Hábito">
                <NewHabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
