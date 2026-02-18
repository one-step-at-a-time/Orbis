import React from 'react';
import { Sparkles, CheckCircle2, TrendingUp, DollarSign, Target, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { StatsCard } from '../components/Common';
import { PageHeader } from '../components/PageHeader';
import { useAppData } from '../context/DataContext';

export function AnalisesPage() {
    const { tasks, finances, habits } = useAppData();

    const handleExport = () => {
        window.print();
    };

    const completed = tasks.filter(t => t.status === "concluida").length;
    const taskRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    const receitas = finances.filter(f => f.tipo === "receita").reduce((a, f) => a + f.valor, 0);
    const despesas = finances.filter(f => f.tipo === "despesa").reduce((a, f) => a + f.valor, 0);
    const saldo = receitas - despesas;
    const habitRate = habits.reduce((a, h) => a + h.metaMensal, 0) > 0
        ? Math.round(habits.reduce((a, h) => a + h.logs.length, 0) / habits.reduce((a, h) => a + h.metaMensal, 0) * 100)
        : 0;

    const metrics = [
        { title: "Taxa de Conclusão", value: `${taskRate}%`, icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
        { title: "Produtividade", value: `${Math.min(taskRate + 12, 100)}%`, icon: Activity, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
        { title: "Saúde Financeira", value: `${saldo > 0 ? 85 : 45}%`, icon: DollarSign, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
        { title: "Consistência Hábitos", value: `${habitRate}%`, icon: Target, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    ];

    const history = [
        { mes: "Out", tarefas: 12, financeiro: 1200 },
        { mes: "Nov", tarefas: 18, financeiro: 1500 },
        { mes: "Dez", tarefas: 15, financeiro: -200 },
        { mes: "Jan", tarefas: 22, financeiro: 2100 },
        { mes: "Fev", tarefas: completed, financeiro: saldo },
    ];

    const spendingData = [
        { name: "Moradia", value: 40, color: "#3b82f6" },
        { name: "Alimentação", value: 25, color: "#06b6d4" },
        { name: "Lazer", value: 15, color: "#8b5cf6" },
        { name: "Outros", value: 20, color: "#64748b" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="ANÁLISES" subtitle="RELATÓRIO DE DESEMPENHO" />
                <button className="btn btn-primary" onClick={handleExport}><BarChart3 size={16} /> Exportar Relatório</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {metrics.map(m => (
                    <StatsCard key={m.title} title={m.title} value={m.value} icon={m.icon} iconColor={m.color} bgColor={m.bg} />
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 2fr))", gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <BarChart3 size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Evolução de Tarefas Completas</span>
                    </div>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorTarefas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" />
                                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                                    itemStyle={{ fontSize: 13, fontWeight: 600 }}
                                />
                                <Area type="monotone" dataKey="tarefas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTarefas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <PieChartIcon size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Distribuição de Gastos</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", height: 280 }}>
                        <div style={{ flex: 1, height: "100%" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={spendingData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {spendingData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                            {spendingData.map(item => (
                                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 4, background: item.color }} />
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, marginLeft: "auto" }}>{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <BarChart3 size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 600 }}>Comparativo Mensal (Atividade)</span>
                </div>
                <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" />
                            <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }}
                            />
                            <Bar dataKey="tarefas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ padding: 10, borderRadius: 12, background: "rgba(59, 130, 246, 0.1)" }}>
                        <TrendingUp size={20} color="var(--primary)" />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 18 }}>Análise de Desempenho</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 32 }}>
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>PRODUTIVIDADE</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            Sua produtividade em tarefas aumentou <span style={{ color: "#22c55e", fontWeight: 700 }}>15%</span> em relação ao mês anterior.
                            O horário mais produtivo tem sido entre <span style={{ fontWeight: 600 }}>09:00 e 11:00</span>.
                        </p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>FINANÇAS</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            O gasto com <span style={{ fontWeight: 600 }}>Alimentação</span> está 10% acima do orçamento.
                            Por outro lado, você economizou em <span style={{ color: "#22c55e", fontWeight: 700 }}>Lazer</span> este mês.
                        </p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>HÁBITOS</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            Sua consistência em hábitos está excelente. Continue assim para completar o ciclo de <span style={{ fontWeight: 600 }}>21 dias</span> e consolidar a mudança.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
