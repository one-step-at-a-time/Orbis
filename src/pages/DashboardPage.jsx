import React from 'react';
import {
    CheckCircle2, Clock, AlertTriangle, Calendar, TrendingUp, TrendingDown,
    ArrowUpRight, ArrowDownRight, Sparkles, Folder, Target
} from 'lucide-react';
import { StatsCard, ProgressBar } from '../components/Common';
import { PageHeader } from '../components/PageHeader';
import { formatCurrency } from '../utils/formatters';
import { useAppData } from '../context/DataContext';

export function DashboardPage() {
    const { tasks, habits, projects, reminders, finances } = useAppData();

    const completed = tasks.filter(t => t.status === "concluida").length;
    const pending = tasks.filter(t => t.status === "pendente" || t.status === "fazendo").length;
    const overdue = tasks.filter(t => t.status === "atrasada").length;
    const taskRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const habitsToday = habits.filter(h => h.logs.some(l => l.data === todayStr)).length;
    const habitRate = habits.length > 0 ? Math.round((habits.reduce((a, h) => a + h.logs.length, 0) / habits.reduce((a, h) => a + h.metaMensal, 0)) * 100) : 0;

    const projAtivos = projects.filter(p => p.status === "ativo").length;
    const projConcluidos = projects.filter(p => p.status === "concluido").length;
    const projPausados = projects.filter(p => p.status === "pausado").length;

    const receitas = finances.filter(f => f.tipo === "receita").reduce((a, f) => a + f.valor, 0);
    const despesas = finances.filter(f => f.tipo === "despesa").reduce((a, f) => a + f.valor, 0);
    const saldo = receitas - despesas;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <PageHeader title="STATUS DO SISTEMA" subtitle="PANORAMA COMPLETO DO SEU PROGRESSO" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <StatsCard title="Concluídos Hoje" value={habitsToday} subtitle={`de ${habits.length} hábitos`} icon={CheckCircle2} iconColor="#22c55e" bgColor="rgba(34,197,94,0.1)" />
                <StatsCard title="Pendentes" value={pending} subtitle="tarefas/lembretes" icon={Clock} iconColor="#3b82f6" bgColor="rgba(59,130,246,0.1)" />
                <StatsCard title="Atrasados" value={overdue} subtitle="requerem atenção" icon={AlertTriangle} iconColor="#ef4444" bgColor="rgba(239,68,68,0.1)" />
                <StatsCard title="Próximos" value={reminders.length} subtitle="nos próximos dias" icon={Calendar} iconColor="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <CheckCircle2 size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Tarefas — Fevereiro</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, textAlign: "center" }}>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#22c55e" }}>{completed}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Concluídas</p></div>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#3b82f6" }}>{pending}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Pendentes</p></div>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#ef4444" }}>{overdue}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Atrasadas</p></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Taxa de conclusão</span>
                        <span className="stat-number" style={{ fontSize: 16, color: "var(--primary)" }}>{taskRate}%</span>
                    </div>
                    <ProgressBar value={taskRate} />
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Folder size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Projetos — Fevereiro</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, textAlign: "center" }}>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#22c55e" }}>{projConcluidos}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Concluídos</p></div>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#3b82f6" }}>{projAtivos}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Ativos</p></div>
                        <div><p className="stat-number" style={{ fontSize: 24, color: "#f59e0b" }}>{projPausados}</p><p style={{ fontSize: 11, color: "var(--text-muted)" }}>Pausados</p></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Progresso geral</span>
                        <span className="stat-number" style={{ fontSize: 16, color: "var(--primary)" }}>{Math.round(projects.reduce((a, p) => a + p.tarefasConcluidas, 0) / projects.reduce((a, p) => a + p.totalTarefas, 0) * 100)}%</span>
                    </div>
                    <ProgressBar value={projects.reduce((a, p) => a + p.tarefasConcluidas, 0) / projects.reduce((a, p) => a + p.totalTarefas, 0) * 100} />
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Target size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Hábitos — Fevereiro</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            { label: "Total de hábitos", value: habits.length, color: "var(--text)" },
                            { label: "Completos hoje", value: habitsToday, color: "#22c55e" },
                            { label: "Taxa do mês", value: `${habitRate}%`, color: "var(--primary)" },
                        ].map((item) => (
                            <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.label}</span>
                                <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 12 }}><ProgressBar value={habitRate} /></div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <TrendingUp size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Resumo Financeiro — Fevereiro</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: 14, borderRadius: 10, background: "rgba(34,197,94,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ArrowUpRight size={16} color="#22c55e" /><span style={{ fontSize: 14 }}>Receitas</span></div>
                            <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(receitas)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: 14, borderRadius: 10, background: "rgba(239,68,68,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ArrowDownRight size={16} color="#ef4444" /><span style={{ fontSize: 14 }}>Despesas</span></div>
                            <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(despesas)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: 14, borderRadius: 10, background: "var(--bg-secondary)" }}>
                            <span style={{ fontSize: 14 }}>Saldo do Mês</span>
                            <span style={{ fontWeight: 700, color: saldo >= 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(saldo)}</span>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Sparkles size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Insights Inteligentes</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                            { icon: AlertTriangle, iconColor: "#f59e0b", bg: "rgba(245,158,11,0.1)", title: "Itens atrasados", desc: `${overdue} tarefa(s) precisam de atenção urgente.` },
                            { icon: TrendingUp, iconColor: "#22c55e", bg: "rgba(34,197,94,0.1)", title: saldo > 0 ? "Saldo positivo" : "Atenção às finanças", desc: saldo > 0 ? `Você está ${formatCurrency(saldo)} no positivo este mês.` : "Seu saldo está negativo este mês." },
                            { icon: Calendar, iconColor: "#3b82f6", bg: "rgba(59,130,246,0.1)", title: "Semana movimentada", desc: `${reminders.length} compromissos nos próximos dias.` },
                        ].map((insight, i) => (
                            <div key={i} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 10, background: "rgba(17,24,39,0.6)" }}>
                                <div style={{ padding: 8, borderRadius: 8, background: insight.bg, flexShrink: 0, height: "fit-content" }}>
                                    <insight.icon size={16} color={insight.iconColor} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 600 }}>{insight.title}</p>
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{insight.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
