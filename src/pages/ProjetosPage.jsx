import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock } from 'lucide-react';
import { Badge, ProgressBar } from '../components/Common';
import { useAppData } from '../context/DataContext';
import { Modal } from '../components/Modal';
import { NewProjectModal } from '../components/Modals';

export function ProjetosPage() {
    const { projects } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);


    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Projetos</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Gerencie seus projetos e acompanhe o progresso</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Novo Projeto</button>
            </div>


            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                {projects.map(p => {
                    const progress = p.totalTarefas ? Math.round((p.tarefasConcluidas / p.totalTarefas) * 100) : 0;
                    const statusMap = { ativo: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" }, pausado: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" }, concluido: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" } };
                    const s = statusMap[p.status] || statusMap.ativo;
                    return (
                        <div key={p.id} className="card animate-slide-up" style={{ padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.cor }} />
                                    <h3 style={{ fontWeight: 700, fontSize: 16 }}>{p.titulo}</h3>
                                </div>
                                <Badge color={s.color} bg={s.bg}>{p.status}</Badge>
                            </div>
                            {p.descricao && <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{p.descricao}</p>}
                            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
                                    <CheckCircle2 size={14} /> <span>{p.tarefasConcluidas}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
                                    <Clock size={14} /> <span>{p.totalTarefas - p.tarefasConcluidas}</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Progresso</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{progress}%</span>
                            </div>
                            <ProgressBar value={progress} />
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Projeto">
                <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
