import React, { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Bell, Plus, Calendar, Trash2 } from 'lucide-react';
import { Badge } from '../components/Common';
import { formatDateTime } from '../utils/formatters';
import { useAppData } from '../context/DataContext';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewReminderModal } from '../components/Modals';

export function LembretesPage() {
    const { reminders, deleteReminder } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [gridParent] = useAutoAnimate();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="LEMBRETES" subtitle="ALERTAS DO SISTEMA" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Novo Lembrete</button>
            </div>


            <div ref={gridParent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                {reminders.map(r => {
                    const impMap = { alta: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" }, media: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" }, baixa: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" } };
                    const imp = impMap[r.importancia] || impMap.media;
                    return (
                        <div key={r.id} className="card animate-slide-up" style={{ padding: 16 }}>
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ padding: 10, borderRadius: 10, background: imp.bg, flexShrink: 0, height: "fit-content" }}>
                                    <Bell size={18} color={imp.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontWeight: 600, fontSize: 14 }}>{r.titulo}</h4>
                                    {r.descricao && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{r.descricao}</p>}
                                    <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-dim)" }}>
                                            <Calendar size={12} /> {formatDateTime(r.dataHora)}
                                        </span>
                                        <Badge color={imp.color} bg={imp.bg}>{r.importancia}</Badge>
                                    </div>
                                </div>
                                <button
                                    className="btn-ghost"
                                    onClick={() => deleteReminder(r.id)}
                                    title="Excluir lembrete"
                                    style={{ padding: 6, color: "var(--text-dim)", alignSelf: "flex-start" }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lembrete">
                <NewReminderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
