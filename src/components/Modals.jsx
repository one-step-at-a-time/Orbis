import React, { useState } from 'react';
import { useAppData } from '../context/DataContext';

export function NewTaskModal({ isOpen, onClose }) {
    const { addTask, projects } = useAppData();
    const [task, setTask] = useState({
        titulo: "",
        descricao: "",
        prioridade: "media",
        dataPrazo: "",
        projetoId: ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!task.titulo) return;

        const selectedProj = projects.find(p => p.id === task.projetoId);
        addTask({
            ...task,
            status: "pendente",
            projeto: selectedProj ? { titulo: selectedProj.titulo, cor: selectedProj.cor } : null
        });
        setTask({ titulo: "", descricao: "", prioridade: "media", dataPrazo: "", projetoId: "" });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Título da Tarefa</label>
                <input autoFocus required type="text" value={task.titulo} onChange={e => setTask({ ...task, titulo: e.target.value })} placeholder="Ex: Terminar relatório" />
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Descrição (opcional)</label>
                <textarea value={task.descricao} onChange={e => setTask({ ...task, descricao: e.target.value })} placeholder="Detalhes sobre a tarefa..." rows={3} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Prioridade</label>
                    <select value={task.prioridade} onChange={e => setTask({ ...task, prioridade: e.target.value })}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Prazo</label>
                    <input type="date" value={task.dataPrazo} onChange={e => setTask({ ...task, dataPrazo: e.target.value })} />
                </div>
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Projeto</label>
                <select value={task.projetoId} onChange={e => setTask({ ...task, projetoId: e.target.value })}>
                    <option value="">Nenhum</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>Criar Tarefa</button>
            </div>
        </form>
    );
}

export function NewHabitModal({ isOpen, onClose }) {
    const { addHabit } = useAppData();
    const [habit, setHabit] = useState({ titulo: "", descricao: "", icone: "✨", metaMensal: 30 });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!habit.titulo) return;
        addHabit(habit);
        setHabit({ titulo: "", descricao: "", icone: "✨", metaMensal: 30 });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 60 }}>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Ícone</label>
                    <input type="text" value={habit.icone} onChange={e => setHabit({ ...habit, icone: e.target.value })} placeholder="✨" style={{ textAlign: "center", fontSize: 20 }} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Nome do Hábito</label>
                    <input autoFocus required type="text" value={habit.titulo} onChange={e => setHabit({ ...habit, titulo: e.target.value })} placeholder="Ex: Meditação Diária" />
                </div>
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Descrição</label>
                <input type="text" value={habit.descricao} onChange={e => setHabit({ ...habit, descricao: e.target.value })} placeholder="Por que este hábito é importante?" />
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Meta Mensal (dias)</label>
                <input type="number" min="1" max="31" value={habit.metaMensal} onChange={e => setHabit({ ...habit, metaMensal: parseInt(e.target.value) })} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>Criar Hábito</button>
            </div>
        </form>
    );
}

export function NewProjectModal({ isOpen, onClose }) {
    const { addProject } = useAppData();
    const [proj, setProj] = useState({ titulo: "", descricao: "", cor: "#8b5cf6" });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!proj.titulo) return;
        addProject(proj);
        setProj({ titulo: "", descricao: "", cor: "#8b5cf6" });
        onClose();
    };

    const colors = ["#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Título do Projeto</label>
                <input autoFocus required type="text" value={proj.titulo} onChange={e => setProj({ ...proj, titulo: e.target.value })} placeholder="Ex: Meu Grande Projeto" />
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Descrição</label>
                <textarea value={proj.descricao} onChange={e => setProj({ ...proj, descricao: e.target.value })} placeholder="Objetivos do projeto..." rows={3} />
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Cor do Projeto</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {colors.map(c => (
                        <button key={c} type="button" onClick={() => setProj({ ...proj, cor: c })} style={{ width: 28, height: 28, borderRadius: "50%", border: proj.cor === c ? "2px solid white" : "none", background: c, cursor: "pointer", outline: proj.cor === c ? `2px solid ${c}` : "none" }} />
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>Criar Projeto</button>
            </div>
        </form>
    );
}


export function NewReminderModal({ isOpen, onClose }) {
    const { addReminder } = useAppData();
    const [rem, setRem] = useState({ titulo: "", descricao: "", importancia: "media", dataHora: "" });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rem.titulo || !rem.dataHora) return;
        addReminder(rem);
        setRem({ titulo: "", descricao: "", importancia: "media", dataHora: "" });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Título do Lembrete</label>
                <input autoFocus required type="text" value={rem.titulo} onChange={e => setRem({ ...rem, titulo: e.target.value })} placeholder="Ex: Médico amanhã" />
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Descrição</label>
                <input type="text" value={rem.descricao} onChange={e => setRem({ ...rem, descricao: e.target.value })} placeholder="Mais detalhes..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Importância</label>
                    <select value={rem.importancia} onChange={e => setRem({ ...rem, importancia: e.target.value })}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Data e Hora</label>
                    <input required type="datetime-local" value={rem.dataHora} onChange={e => setRem({ ...rem, dataHora: e.target.value })} />
                </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>Criar Lembrete</button>
            </div>
        </form>
    );
}

export function NewFinanceModal({ isOpen, onClose }) {
    const { addFinance } = useAppData();
    const [fin, setFin] = useState({ descricao: "", valor: "", tipo: "despesa", categoria: "Geral", data: new Date().toISOString().split('T')[0] });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!fin.descricao || !fin.valor) return;
        addFinance({ ...fin, valor: parseFloat(fin.valor) });
        setFin({ descricao: "", valor: "", tipo: "despesa", categoria: "Geral", data: new Date().toISOString().split('T')[0] });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Tipo</label>
                <div style={{ display: "flex", gap: 8, background: "var(--bg-secondary)", padding: 4, borderRadius: 10 }}>
                    {["despesa", "receita"].map(t => (
                        <button key={t} type="button" onClick={() => setFin({ ...fin, tipo: t })} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: fin.tipo === t ? (t === "receita" ? "#22c55e" : "#ef4444") : "transparent", color: fin.tipo === t ? "white" : "var(--text-muted)", fontWeight: 600, textTransform: "capitalize" }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Descrição</label>
                <input autoFocus required type="text" value={fin.descricao} onChange={e => setFin({ ...fin, descricao: e.target.value })} placeholder="Ex: Aluguel, Supermercado" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Valor (R$)</label>
                    <input required type="number" step="0.01" value={fin.valor} onChange={e => setFin({ ...fin, valor: e.target.value })} placeholder="0,00" />
                </div>
                <div>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Data</label>
                    <input type="date" value={fin.data} onChange={e => setFin({ ...fin, data: e.target.value })} />
                </div>
            </div>
            <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Categoria</label>
                <select value={fin.categoria} onChange={e => setFin({ ...fin, categoria: e.target.value })}>
                    {["Geral", "Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Salário", "Investimento"].map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>Registrar</button>
            </div>
        </form>
    );
}

