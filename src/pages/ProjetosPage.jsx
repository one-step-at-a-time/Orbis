import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock, Trash2, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { ProgressBar } from '../components/Common';
import { useAppData } from '../context/DataContext';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewProjectModal } from '../components/Modals';
import { motion, AnimatePresence } from 'framer-motion';

// Ciclo de status ao clicar no badge
const STATUS_CYCLE = { ativo: 'pausado', pausado: 'concluido', concluido: 'ativo' };
const STATUS_LABEL = { ativo: 'ativo', pausado: 'pausado', concluido: 'concluído' };
const STATUS_STYLE = {
    ativo:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
    pausado:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
    concluido: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
};

export function ProjetosPage() {
    const { projects, tasks, updateProject, deleteProject, addTask, updateTask } = useAppData();
    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [expandedId, setExpandedId]     = useState(null);
    const [newTaskTitles, setNewTaskTitles] = useState({});

    const handleAddTask = (project) => {
        const titulo = (newTaskTitles[project.id] || '').trim();
        if (!titulo) return;
        addTask({
            titulo,
            status: 'pendente',
            prioridade: 'media',
            projeto: { titulo: project.titulo, cor: project.cor },
        });
        setNewTaskTitles(prev => ({ ...prev, [project.id]: '' }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <PageHeader title="PROJETOS" subtitle="MISSÕES DE LONGA DURAÇÃO" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> Novo Projeto
                </button>
            </div>

            {projects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', fontSize: 12, letterSpacing: '0.08em' }}>
                    NENHUM PROJETO ATIVO — CRIE UM NOVO PARA COMEÇAR
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {projects.map(p => {
                    const projectTasks = tasks.filter(t => t.projeto?.titulo === p.titulo);
                    const total    = projectTasks.length;
                    const done     = projectTasks.filter(t => t.status === 'concluida').length;
                    const pending  = total - done;
                    const progress = total ? Math.round((done / total) * 100) : 0;
                    const s        = STATUS_STYLE[p.status] || STATUS_STYLE.ativo;
                    const expanded = expandedId === p.id;

                    return (
                        <div key={p.id} className="card animate-slide-up" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* ── Cabeçalho do card ── */}
                            <div style={{ padding: '18px 20px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        <div style={{ width: 11, height: 11, borderRadius: '50%', background: p.cor, flexShrink: 0, boxShadow: `0 0 6px ${p.cor}88` }} />
                                        <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        {/* Status clicável */}
                                        <button
                                            onClick={() => updateProject(p.id, { status: STATUS_CYCLE[p.status] })}
                                            title="Clique para mudar status"
                                            style={{
                                                padding: '3px 9px',
                                                borderRadius: 4,
                                                fontSize: 10,
                                                fontFamily: 'var(--font-interface)',
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: s.bg,
                                                color: s.color,
                                                border: `1px solid ${s.border}`,
                                                transition: 'all 0.18s',
                                            }}
                                        >
                                            {STATUS_LABEL[p.status]}
                                        </button>
                                        <button
                                            className="btn-ghost"
                                            onClick={() => deleteProject(p.id)}
                                            title="Excluir projeto"
                                            style={{ padding: 4, color: 'var(--text-dim)' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {p.descricao && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{p.descricao}</p>
                                )}

                                {/* Contadores */}
                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)' }}>
                                        <CheckCircle2 size={13} /> <span>{done} concluídas</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                        <Clock size={13} /> <span>{pending} pendentes</span>
                                    </div>
                                </div>

                                {/* Barra de progresso */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progresso</span>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{progress}%</span>
                                </div>
                                <ProgressBar value={progress} />
                            </div>

                            {/* ── Botão expandir ── */}
                            <button
                                onClick={() => setExpandedId(expanded ? null : p.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '9px 20px',
                                    background: expanded ? 'rgba(0,240,255,0.05)' : 'rgba(0,0,0,0.2)',
                                    border: 'none',
                                    borderTop: '1px solid rgba(0,240,255,0.08)',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontFamily: 'var(--font-interface)',
                                    letterSpacing: '0.08em',
                                    color: expanded ? 'var(--primary)' : 'var(--text-muted)',
                                    transition: 'all 0.18s',
                                }}
                            >
                                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                {total > 0
                                    ? `${total} tarefa${total !== 1 ? 's' : ''}`
                                    : 'ADICIONAR TAREFAS'}
                            </button>

                            {/* ── Lista de tarefas (expansível) ── */}
                            <AnimatePresence>
                                {expanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        style={{ overflow: 'hidden', borderTop: '1px solid rgba(0,240,255,0.08)' }}
                                    >
                                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {projectTasks.length === 0 && (
                                                <p style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-interface)', letterSpacing: '0.06em', textAlign: 'center', padding: '8px 0' }}>
                                                    NENHUMA TAREFA — ADICIONE ABAIXO
                                                </p>
                                            )}

                                            {projectTasks.map(t => {
                                                const concluida = t.status === 'concluida';
                                                return (
                                                    <div
                                                        key={t.id}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 5, background: concluida ? 'rgba(0,0,0,0)' : 'rgba(0,240,255,0.02)', cursor: 'pointer', transition: 'background 0.15s' }}
                                                        onClick={() => updateTask(t.id, { status: concluida ? 'pendente' : 'concluida' })}
                                                    >
                                                        {concluida
                                                            ? <CheckCircle2 size={15} color="var(--success)" style={{ flexShrink: 0 }} />
                                                            : <Circle size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                                        }
                                                        <span style={{
                                                            fontSize: 13,
                                                            color: concluida ? 'var(--text-muted)' : 'var(--text)',
                                                            textDecoration: concluida ? 'line-through' : 'none',
                                                            flex: 1,
                                                            lineHeight: 1.4,
                                                        }}>
                                                            {t.titulo}
                                                        </span>
                                                        {t.prioridade === 'alta' && (
                                                            <span style={{ fontSize: 9, color: 'var(--danger)', fontFamily: 'var(--font-interface)', letterSpacing: '0.06em', flexShrink: 0 }}>ALTA</span>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Quick-add */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,240,255,0.06)' }}>
                                                <input
                                                    type="text"
                                                    value={newTaskTitles[p.id] || ''}
                                                    onChange={e => setNewTaskTitles(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(p); } }}
                                                    placeholder="Nova tarefa... (Enter para adicionar)"
                                                    style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleAddTask(p)}
                                                    style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
                                                    title="Adicionar tarefa"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
