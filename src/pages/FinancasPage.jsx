import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatsCard } from '../components/Common';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewFinanceModal } from '../components/Modals';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAppData } from '../context/DataContext';

export function FinancasPage() {
    const { finances } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const receitas = finances.filter(f => f.tipo === "receita").reduce((a, f) => a + f.valor, 0);
    const despesas = finances.filter(f => f.tipo === "despesa").reduce((a, f) => a + f.valor, 0);
    const saldo = receitas - despesas;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="FINANÇAS" subtitle="GESTÃO DE RECURSOS" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> Novo Lançamento
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                <StatsCard title="Receitas" value={formatCurrency(receitas)} icon={TrendingUp} iconColor="#22c55e" bgColor="rgba(34,197,94,0.1)" />
                <StatsCard title="Despesas" value={formatCurrency(despesas)} icon={TrendingDown} iconColor="#ef4444" bgColor="rgba(239,68,68,0.1)" />
                <StatsCard title="Saldo" value={formatCurrency(saldo)} icon={DollarSign} iconColor={saldo >= 0 ? "#22c55e" : "#ef4444"} bgColor={saldo >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"} />
            </div>

            <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Lançamentos Recentes</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {finances.map(f => (
                        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 10, background: "rgba(17,24,39,0.5)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ padding: 8, borderRadius: 8, background: f.tipo === "receita" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                                    {f.tipo === "receita" ? <ArrowUpRight size={16} color="#22c55e" /> : <ArrowDownRight size={16} color="#ef4444" />}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 14 }}>{f.descricao}</p>
                                    <p style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(f.data)} • {f.categoria}</p>
                                </div>
                            </div>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: f.tipo === "receita" ? "#22c55e" : "#ef4444" }}>
                                {f.tipo === "receita" ? "+" : "-"}{formatCurrency(f.valor)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento">
                <NewFinanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
