import React, { useState } from 'react';
import { LayoutList, Columns, Plus, Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../components/Common';
import { Modal } from '../components/Modal';
import { NewTaskModal } from '../components/Modals';
import { formatDate } from '../utils/formatters';
import { useAppData } from '../context/DataContext';

function PriorityBadge({ priority }) {
    const map = {
        alta: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Alta" },
        media: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Média" },
        baixa: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Baixa" },
    };
    const p = map[priority] || map.media;
    return <Badge color={p.color} bg={p.bg}>{p.label}</Badge>;
}

function StatusBadge({ status }) {
    const map = {
        pendente: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Pendente" },
        fazendo: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Fazendo" },
        concluida: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Concluída" },
        atrasada: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Atrasada" },
    };
    const s = map[status] || map.pendente;
    return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

export function TarefasPage() {
    const { tasks, updateTask } = useAppData();
    const [view, setView] = useState("list");
    const [filter, setFilter] = useState("todas");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            updateTask(id, { status: task.status === "concluida" ? "pendente" : "concluida" });
        }
    };

    const filtered = tasks.filter(t => {
        if (filter === "todas") return true;
        if (filter === "pendentes") return t.status === "pendente" || t.status === "fazendo";
        if (filter === "concluidas") return t.status === "concluida";
        if (filter === "atrasadas") return t.status === "atrasada";
        return true;
    });

    const StatusIcon = { pendente: Circle, fazendo: Clock, concluida: CheckCircle2, atrasada: AlertCircle };

    const TaskItem = ({ task }) => {
        const SIcon = StatusIcon[task.status];
        const done = task.status === "concluida";

        const handleDragStart = (e) => {
            e.dataTransfer.setData("taskId", task.id);
            e.currentTarget.style.opacity = "0.4";
        };

        const handleDragEnd = (e) => {
            e.currentTarget.style.opacity = "1";
        };

        return (
            <div
                className="card"
                style={{ padding: 16, opacity: done ? 0.6 : 1, cursor: "grab" }}
                draggable="true"
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: done ? "#22c55e" : "var(--text-muted)", marginTop: 2, flexShrink: 0 }}>
                        <SIcon size={20} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <h4 style={{ fontWeight: 600, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "var(--text-muted)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.titulo}</h4>
                            <PriorityBadge priority={task.prioridade} />
                        </div>
                        {task.descricao && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{task.descricao}</p>}
                        <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <StatusBadge status={task.status} />
                            {task.dataPrazo && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(task.dataPrazo)}</span>}
                            {task.projeto && (
                                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${task.projeto.cor}18`, color: task.projeto.cor, fontWeight: 600 }}>
                                    {task.projeto.titulo}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const kanbanCols = [
        { key: "pendente", label: "Para Fazer", color: "#f59e0b" },
        { key: "fazendo", label: "Fazendo", color: "#3b82f6" },
        { key: "concluida", label: "Feito", color: "#22c55e" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Tarefas</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Organize e acompanhe suas tarefas</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 8, padding: 3 }}>
                        {[{ k: "list", icon: LayoutList }, { k: "kanban", icon: Columns }].map(v => (
                            <button key={v.k} onClick={() => setView(v.k)} style={{ padding: 8, borderRadius: 6, background: view === v.k ? "var(--primary)" : "transparent", border: "none", cursor: "pointer", color: view === v.k ? "white" : "var(--text-muted)", display: "flex" }}>
                                <v.icon size={16} />
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {view === "list" ? (
                <>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["todas", "pendentes", "concluidas", "atrasadas"].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={filter === f ? "tab-active" : "tab-inactive"} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, fontSize: 13, textTransform: "capitalize" }}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {filtered.length === 0 ? (
                            <p style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Nenhuma tarefa encontrada</p>
                        ) : filtered.map(t => <TaskItem key={t.id} task={t} />)}
                    </div>
                </>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                    {kanbanCols.map(col => (
                        <div
                            key={col.key}
                            className="card"
                            style={{ padding: 16, background: "rgba(17,24,39,0.2)", minHeight: 400 }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const taskId = e.dataTransfer.getData("taskId");
                                updateTask(taskId, { status: col.key });
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{col.label}</span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({tasks.filter(t => t.status === col.key).length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {tasks.filter(t => t.status === col.key).map(t => <TaskItem key={t.id} task={t} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Tarefa">
                <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
