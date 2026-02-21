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
        { title: "Taxa de Conclusão", value: `${taskRate}%`, icon: CheckCircle2, color: "var(--success)", bg: "rgba(0,255,157,0.1)" },
        { title: "Produtividade", value: `${Math.min(taskRate + habitRate, 100) > 0 ? Math.round((taskRate + habitRate) / 2) : 0}%`, icon: Activity, color: "var(--primary)", bg: "rgba(59,89,255,0.1)" },
        { title: "Saúde Financeira", value: receitas > 0 ? `${Math.min(Math.round((saldo / receitas) * 100 + 50), 100)}%` : (saldo >= 0 ? "100%" : "0%"), icon: DollarSign, color: "var(--accent)", bg: "rgba(124,58,237,0.1)" },
        { title: "Consistência Hábitos", value: `${habitRate}%`, icon: Target, color: "var(--warning)", bg: "rgba(245,158,11,0.1)" },
    ];

    // Últimos 5 meses de dados reais agrupados por mês
    const now = new Date();
    const history = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const tarefasMes = tasks.filter(t => t.status === 'concluida' && (t.dataPrazo || '').startsWith(mesKey)).length;
        const receitasMes = finances.filter(f => f.tipo === 'receita' && (f.data || '').startsWith(mesKey)).reduce((a, f) => a + f.valor, 0);
        const despesasMes = finances.filter(f => f.tipo === 'despesa' && (f.data || '').startsWith(mesKey)).reduce((a, f) => a + f.valor, 0);
        return { mes: label.charAt(0).toUpperCase() + label.slice(1), tarefas: tarefasMes, financeiro: receitasMes - despesasMes };
    });

    // Gastos por categoria — dados reais das finanças
    const CHART_COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899", "#64748b"];
    const despesasByCategory = finances
        .filter(f => f.tipo === 'despesa')
        .reduce((acc, f) => {
            const cat = f.categoria || 'Outros';
            acc[cat] = (acc[cat] || 0) + f.valor;
            return acc;
        }, {});
    const totalDespesas = Object.values(despesasByCategory).reduce((a, v) => a + v, 0);
    const spendingData = Object.entries(despesasByCategory).length > 0
        ? Object.entries(despesasByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value], i) => ({
                name,
                value: totalDespesas > 0 ? Math.round((value / totalDespesas) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length]
            }))
        : [{ name: "Sem dados", value: 100, color: "#64748b" }];

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
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>TAREFAS</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            {tasks.length === 0
                                ? "Nenhuma tarefa cadastrada ainda. Comece criando sua primeira missão."
                                : taskRate >= 70
                                    ? <><span style={{ color: "#22c55e", fontWeight: 700 }}>{completed}</span> de {tasks.length} tarefas concluídas ({taskRate}%). Excelente desempenho! Continue assim.</>
                                    : <>{completed} de {tasks.length} tarefas concluídas ({taskRate}%). Há <span style={{ color: "#ef4444", fontWeight: 700 }}>{tasks.filter(t => t.status === 'atrasada').length} atrasadas</span> aguardando atenção.</>
                            }
                        </p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>FINANÇAS</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            {finances.length === 0
                                ? "Nenhuma transação registrada. Registre receitas e despesas para ver análises."
                                : saldo >= 0
                                    ? <>Saldo positivo de <span style={{ color: "#22c55e", fontWeight: 700 }}>R$ {saldo.toFixed(2).replace('.', ',')}</span>. {spendingData[0]?.name !== 'Sem dados' ? `Maior gasto: ${spendingData[0]?.name}.` : ''}</>
                                    : <>Saldo negativo de <span style={{ color: "#ef4444", fontWeight: 700 }}>R$ {Math.abs(saldo).toFixed(2).replace('.', ',')}</span>. Considere revisar seus gastos.</>
                            }
                        </p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>HÁBITOS</h4>
                        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                            {habits.length === 0
                                ? "Nenhum hábito cadastrado. Construa disciplina criando seus primeiros hábitos."
                                : habitRate >= 80
                                    ? <>Consistência de <span style={{ color: "#22c55e", fontWeight: 700 }}>{habitRate}%</span>. Excelente! Você está no caminho certo para consolidar seus hábitos.</>
                                    : <>Consistência de <span style={{ color: "#f59e0b", fontWeight: 700 }}>{habitRate}%</span> nos hábitos. Tente manter a sequência diária para melhorar.</>
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
