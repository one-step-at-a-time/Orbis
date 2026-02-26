import React, { useState, useRef, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Typewriter from 'typewriter-effect';
import {
    LayoutList, Columns, Plus, Circle, Clock, CheckCircle2, AlertCircle,
    Sparkles, Send, Bot, User, Loader, Settings, Check, Trash2
} from 'lucide-react';
import { Badge } from '../components/Common';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewTaskModal } from '../components/Modals';
import { formatDate } from '../utils/formatters';
import { useAppData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { callAiProvider } from '../services/aiProviderService';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStoredKey(name) {
    try {
        const raw = window.localStorage.getItem(name);
        if (!raw) return '';
        try { return JSON.parse(raw); } catch { return raw; }
    } catch { return ''; }
}

function getAiConfig() {
    const provider = getStoredKey('orbis_ai_provider') || 'gemini';
    const keyMap = {
        gemini: 'orbis_gemini_key',
        openrouter: 'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key',
        zhipu: 'orbis_zhipu_key',
    };
    const key = getStoredKey(keyMap[provider] || 'orbis_gemini_key');
    const model = getStoredKey('orbis_ai_model') || undefined;
    return { provider, key, model };
}

function _findActionJsonSpans(text) {
    const spans = [];
    const marker = /\{\s*"action"\s*:/g;
    let match;
    while ((match = marker.exec(text)) !== null) {
        const start = match.index;
        let depth = 0, j = start;
        while (j < text.length) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') {
                depth--;
                if (depth === 0) { spans.push([start, j + 1]); break; }
            }
            j++;
        }
    }
    return spans;
}

function extractActionJsons(text) {
    return _findActionJsonSpans(text).map(([s, e]) => {
        try { return JSON.parse(text.slice(s, e)); } catch { return null; }
    }).filter(Boolean);
}

function removeActionJsons(text) {
    const spans = _findActionJsonSpans(text);
    if (!spans.length) return text;
    let result = '';
    let last = 0;
    for (const [s, e] of spans) {
        result += text.slice(last, s);
        last = e;
    }
    return (result + text.slice(last)).replace(/\n{3,}/g, '\n\n').trim();
}

function cleanIaMsg(text) {
    if (!text) return '';
    let t = removeActionJsons(text);
    t = t.replace(/```json[\s\S]*?```/gi, '');
    t = t.replace(/```[\s\S]*?```/g, '');
    t = t.replace(/^\s*\{[^]*?\}\s*$/gm, '');
    t = t.replace(/\*/g, '');
    t = t.replace(/#{1,6}\s+/g, '');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
}

function buildTaskContext(tasks) {
    if (!tasks || tasks.length === 0) return 'Nenhuma tarefa cadastrada ainda.';

    const pending = tasks.filter(t => t.status === 'pendente').length;
    const doing   = tasks.filter(t => t.status === 'fazendo').length;
    const done    = tasks.filter(t => t.status === 'concluida').length;
    const late    = tasks.filter(t => t.status === 'atrasada').length;
    const alta    = tasks.filter(t => t.prioridade === 'alta' && t.status !== 'concluida').length;
    const total   = tasks.length;
    const taxaConclusao = total > 0 ? Math.round((done / total) * 100) : 0;

    const lines = [
        'DADOS DE TAREFAS REAIS DO CAÇADOR:',
        `- Total: ${total} | Pendentes: ${pending} | Fazendo: ${doing} | Concluídas: ${done} | Atrasadas: ${late}`,
        `- Taxa de conclusão: ${taxaConclusao}%`,
        `- Alta prioridade não concluída: ${alta}`,
    ];

    const active = tasks
        .filter(t => t.status !== 'concluida')
        .sort((a, b) => {
            const order = { atrasada: 0, fazendo: 1, pendente: 2 };
            const oA = order[a.status] ?? 3, oB = order[b.status] ?? 3;
            if (oA !== oB) return oA - oB;
            const pOrder = { alta: 0, media: 1, baixa: 2 };
            return (pOrder[a.prioridade] ?? 1) - (pOrder[b.prioridade] ?? 1);
        })
        .slice(0, 15);

    if (active.length > 0) {
        lines.push('- Tarefas ativas (urgência > prioridade):');
        active.forEach(t => {
            lines.push(`  • [${t.status}][${t.prioridade || 'media'}] ${t.titulo}${t.dataPrazo ? ` | prazo: ${t.dataPrazo}` : ''}`);
        });
    }

    return lines.join('\n');
}

// ── System prompt addon ───────────────────────────────────────────────────────

const TASK_SYSTEM_ADDON = `

MÓDULO ATIVO: ASSISTENTE DE PRODUTIVIDADE E TAREFAS

Você está no módulo de gestão de tarefas pessoais. REGRAS OBRIGATÓRIAS:
1. SEMPRE analise os dados reais das tarefas — cite títulos, status e prazos pelo nome.
2. Identifique tarefas atrasadas, gargalos de alta prioridade e padrões de procrastinação.
3. Sugira ordem de execução baseada em urgência, prazo e prioridade.
4. Seja direto e prático. Responda em português. Sem asteriscos, sem markdown.

CRIAÇÃO AUTOMÁTICA DE TAREFAS:
Quando o Caçador pedir para criar uma tarefa (ex: "cria uma tarefa para X", "nova missão: Y"):
- Escreva PRIMEIRO toda a sua resposta em texto limpo.
- AO FINAL da resposta, em linha separada, emita SOMENTE o JSON:
  { "action": "CREATE_TASK", "data": { "titulo": "...", "descricao": "...", "prioridade": "alta|media|baixa", "dataPrazo": "YYYY-MM-DD" } }
- Após o JSON, em nova linha: "[ SISTEMA ]: Missão criada — [título]."
- Se não houver prazo definido, omita o campo "dataPrazo".
Prioridades: alta (urgente), media (importante), baixa (desejável).
`;

// ── Quick actions ─────────────────────────────────────────────────────────────

const TASK_QUICK_ACTIONS = [
    { label: 'O que priorizar?',    prompt: 'Com base nas minhas tarefas reais, o que devo focar agora?' },
    { label: 'Tarefas atrasadas',   prompt: 'Quais são minhas tarefas atrasadas e como devo agir?' },
    { label: 'Minha produtividade', prompt: 'Analise minha taxa de conclusão e produtividade geral.' },
    { label: 'Planejar a semana',   prompt: 'Me ajude a planejar minha semana com base nas tarefas pendentes.' },
    { label: 'Criar uma missão',    prompt: 'Quero criar uma nova tarefa. Me ajude a defini-la.' },
];

// ── Animações ─────────────────────────────────────────────────────────────────

const TASK_ANIM_CSS = `
@keyframes task-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
}
@keyframes task-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
`;

// ── Badges ────────────────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
    const map = {
        alta:  { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Alta"  },
        media: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Média" },
        baixa: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Baixa" },
    };
    const p = map[priority] || map.media;
    return <Badge color={p.color} bg={p.bg}>{p.label}</Badge>;
}

function StatusBadge({ status }) {
    const map = {
        pendente: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Pendente"  },
        fazendo:  { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Fazendo"   },
        concluida:{ color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "Concluída" },
        atrasada: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Atrasada"  },
    };
    const s = map[status] || map.pendente;
    return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TarefasPage() {
    const { tasks, updateTask, addTask } = useAppData();
    const { gainXP } = usePlayer();
    const [view, setView]       = useState("list");
    const [filter, setFilter]   = useState("todas");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listParent] = useAutoAnimate();

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('tarefas');

    // ── Chat ──────────────────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useLocalStorage('orbis_task_chat', []);
    const [chatInput,    setChatInput]    = useState('');
    const [chatLoading,  setChatLoading]  = useState(false);
    const [chatError,    setChatError]    = useState(null);
    const [typingMsgId,  setTypingMsgId]  = useState(null);
    const chatScrollRef = useRef(null);

    // ── Config inline ─────────────────────────────────────────────────────────
    const [showConfig,  setShowConfig]  = useState(false);
    const [cfgProvider, setCfgProvider] = useState(() => getStoredKey('orbis_ai_provider') || 'siliconflow');
    const [cfgKey,      setCfgKey]      = useState('');
    const [cfgSaved,    setCfgSaved]    = useState(false);

    const CFG_KEY_MAP = {
        gemini:      'orbis_gemini_key',
        openrouter:  'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key',
        zhipu:       'orbis_zhipu_key',
    };

    function handleSaveConfig() {
        const k = cfgKey.trim();
        if (k.length < 6) return;
        window.localStorage.setItem(CFG_KEY_MAP[cfgProvider], JSON.stringify(k));
        window.localStorage.setItem('orbis_ai_provider', JSON.stringify(cfgProvider));
        setCfgKey('');
        setCfgSaved(true);
        setChatError(null);
        setTimeout(() => { setCfgSaved(false); setShowConfig(false); }, 1200);
    }

    // Auto-scroll
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [chatMessages]);

    // ── Handlers de tarefas ───────────────────────────────────────────────────
    const toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const completing = task.status !== "concluida";
            updateTask(id, { status: completing ? "concluida" : "pendente" });
            if (completing) gainXP(task.prioridade || 'media');
        }
    };

    const handleKanbanDrop = (taskId, newStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const wasCompleted  = task.status === 'concluida';
        const isNowCompleted = newStatus === 'concluida';
        updateTask(taskId, { status: newStatus });
        if (isNowCompleted && !wasCompleted) gainXP(task.prioridade || 'media');
    };

    const filtered = tasks.filter(t => {
        if (filter === "todas")     return true;
        if (filter === "pendentes") return t.status === "pendente" || t.status === "fazendo";
        if (filter === "concluidas") return t.status === "concluida";
        if (filter === "atrasadas") return t.status === "atrasada";
        return true;
    });

    const StatusIcon = { pendente: Circle, fazendo: Clock, concluida: CheckCircle2, atrasada: AlertCircle };

    // ── Handler do chat ───────────────────────────────────────────────────────
    async function handleSendTaskChat(text) {
        const msg = (text || chatInput).trim();
        if (!msg || chatLoading) return;
        setChatInput('');
        setChatError(null);

        const { provider, key, model } = getAiConfig();
        if (!key) { setShowConfig(true); return; }

        const userMsgId  = Date.now();
        const newUserMsg = { id: userMsgId, tipo: 'usuario', mensagem: msg };
        const prevMessages = chatMessages;
        setChatMessages(prev => [...prev, newUserMsg]);
        setChatLoading(true);

        try {
            const ctx       = buildTaskContext(tasks);
            const ctxPrefix = `[CONTEXTO DE TAREFAS ATUALIZADO DO CAÇADOR]:\n${ctx}\n\n---\nPergunta: `;

            const apiMessages = [
                ...prevMessages.slice(-14),
                { ...newUserMsg, mensagem: ctxPrefix + msg },
            ];

            const response = await callAiProvider(provider, apiMessages, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: TASK_SYSTEM_ADDON,
            });

            // Processa CREATE_TASK
            const actions = extractActionJsons(response);
            for (const action of actions) {
                if (action.action === 'CREATE_TASK' && action.data) {
                    const d = action.data;
                    addTask({
                        titulo:    d.titulo    || 'Nova tarefa',
                        descricao: d.descricao || '',
                        prioridade: ['alta', 'media', 'baixa'].includes(d.prioridade) ? d.prioridade : 'media',
                        ...(d.dataPrazo ? { dataPrazo: d.dataPrazo } : {}),
                        status: 'pendente',
                    });
                }
            }

            let clean = removeActionJsons(response)
                .replace(/```json[\s\S]*?```/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\*/g, '')
                .replace(/#{1,6}\s+/g, '')
                .trim();

            const aiMsgId = Date.now() + 1;
            setChatMessages(prev => [...prev, { id: aiMsgId, tipo: 'ia', mensagem: clean }]);
            setTypingMsgId(aiMsgId);
        } catch (err) {
            setChatError(err.message || 'Erro ao contactar o sistema de IA.');
        } finally {
            setChatLoading(false);
        }
    }

    // ── TaskItem ──────────────────────────────────────────────────────────────
    const TaskItem = ({ task }) => {
        const SIcon = StatusIcon[task.status] || Circle;
        const done  = task.status === "concluida";

        return (
            <div
                className="card"
                style={{ padding: 16, opacity: done ? 0.6 : 1, cursor: "grab" }}
                draggable="true"
                onDragStart={e => { e.dataTransfer.setData("taskId", task.id); e.currentTarget.style.opacity = "0.4"; }}
                onDragEnd={e   => { e.currentTarget.style.opacity = "1"; }}
            >
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: done ? "#22c55e" : "var(--text-muted)", marginTop: 2, flexShrink: 0 }}
                    >
                        <SIcon size={20} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <h4 style={{ fontWeight: 600, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "var(--text-muted)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {task.titulo}
                            </h4>
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
        { key: "pendente",  label: "Para Fazer", color: "#f59e0b" },
        { key: "fazendo",   label: "Fazendo",    color: "#3b82f6" },
        { key: "concluida", label: "Feito",      color: "#22c55e" },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <style>{TASK_ANIM_CSS}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="TAREFAS" subtitle="ORGANIZE E ACOMPANHE SUAS MISSÕES" />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {activeTab === 'tarefas' && (
                        <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 8, padding: 3 }}>
                            {[{ k: "list", icon: LayoutList }, { k: "kanban", icon: Columns }].map(v => (
                                <button key={v.k} onClick={() => setView(v.k)} style={{ padding: 8, borderRadius: 6, background: view === v.k ? "var(--primary)" : "transparent", border: "none", cursor: "pointer", color: view === v.k ? "white" : "var(--text-muted)", display: "flex" }}>
                                    <v.icon size={16} />
                                </button>
                            ))}
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { id: 'tarefas',   icon: <LayoutList size={14} />, label: 'TAREFAS'      },
                    { id: 'consultor', icon: <Sparkles   size={14} />, label: 'CONSULTOR IA' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: 1,
                            background: activeTab === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === tab.id ? '#000' : 'var(--text-dim)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAREFAS ── */}
            {activeTab === 'tarefas' && (
                <>
                    {view === "list" ? (
                        <>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {["todas", "pendentes", "concluidas", "atrasadas"].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={filter === f ? "tab-active" : "tab-inactive"} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, fontSize: 13, textTransform: "capitalize" }}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div ref={listParent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => {
                                        e.preventDefault();
                                        handleKanbanDrop(e.dataTransfer.getData("taskId"), col.key);
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
                </>
            )}

            {/* ── CONSULTOR IA ── */}
            {activeTab === 'consultor' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>

                    {/* Header do módulo */}
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: showConfig ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(59,130,246,0.05)',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(59,130,246,0.15)', flexShrink: 0 }}>
                            <Bot size={16} color="var(--primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2 }}>
                                NEURAL AI — MÓDULO DE TAREFAS
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                                Análise inteligente das suas missões e produtividade
                            </p>
                        </div>
                        {chatMessages.length > 0 && (
                            <button
                                onClick={() => { if (window.confirm('Limpar histórico do consultor?')) setChatMessages([]); }}
                                title="Limpar conversa"
                                style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowConfig(v => !v)}
                            title="Configurar API"
                            style={{
                                padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: showConfig ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                color: showConfig ? 'var(--primary)' : 'var(--text-dim)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Settings size={14} />
                        </button>
                    </div>

                    {/* Painel de config */}
                    {showConfig && (
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(59,130,246,0.03)',
                            display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                                CONFIGURAR CHAVE DE API
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <select
                                    value={cfgProvider}
                                    onChange={e => setCfgProvider(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                                >
                                    <option value="siliconflow">SiliconFlow (DeepSeek)</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="zhipu">Zhipu AI (GLM)</option>
                                </select>
                                <input
                                    type="password"
                                    value={cfgKey}
                                    onChange={e => setCfgKey(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveConfig()}
                                    placeholder="Cole sua API Key aqui..."
                                    autoComplete="off"
                                    style={{ flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                                />
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={cfgKey.trim().length < 6}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8, border: 'none',
                                        cursor: cfgKey.trim().length < 6 ? 'not-allowed' : 'pointer',
                                        background: cfgSaved ? 'rgba(34,197,94,0.2)' : cfgKey.trim().length < 6 ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.2)',
                                        color: cfgSaved ? '#22c55e' : cfgKey.trim().length < 6 ? 'var(--text-dim)' : 'var(--primary)',
                                        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.2s', fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                >
                                    {cfgSaved ? <><Check size={13} /> SALVO</> : 'SALVAR'}
                                </button>
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                A chave é salva localmente. Recomendado: SiliconFlow com DeepSeek V3 (gratuito).
                            </p>
                        </div>
                    )}

                    {/* Área de mensagens */}
                    <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* Estado vazio */}
                        {chatMessages.length === 0 && !chatLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Sparkles size={28} color="var(--primary)" style={{ marginBottom: 8 }} />
                                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-dim)', letterSpacing: 1 }}>
                                        O QUE DESEJA ANALISAR?
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
                                    {TASK_QUICK_ACTIONS.map(a => (
                                        <button
                                            key={a.label}
                                            onClick={() => handleSendTaskChat(a.prompt)}
                                            style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mensagens */}
                        {chatMessages.map(m => (
                            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: m.tipo === 'usuario' ? 'flex-end' : 'flex-start' }}>
                                {m.tipo === 'ia' && (
                                    <div style={{ padding: 6, borderRadius: 8, background: 'rgba(59,130,246,0.15)', flexShrink: 0, marginTop: 2 }}>
                                        <Bot size={14} color="var(--primary)" />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '80%', padding: '10px 14px',
                                    borderRadius: m.tipo === 'usuario' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: m.tipo === 'usuario' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: m.tipo === 'usuario' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: 13, lineHeight: 1.65, color: 'var(--text)',
                                }}>
                                    {m.tipo === 'ia' && m.id === typingMsgId ? (
                                        <Typewriter
                                            key={m.id}
                                            options={{ delay: 10, cursor: '▮' }}
                                            onInit={tw => {
                                                tw.typeString(cleanIaMsg(m.mensagem))
                                                    .callFunction(() => setTypingMsgId(null))
                                                    .start();
                                            }}
                                        />
                                    ) : (
                                        <span style={{ whiteSpace: 'pre-wrap' }}>
                                            {m.tipo === 'ia' ? cleanIaMsg(m.mensagem) : m.mensagem}
                                        </span>
                                    )}
                                </div>
                                {m.tipo === 'usuario' && (
                                    <div style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0, marginTop: 2 }}>
                                        <User size={14} color="var(--text-dim)" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading dots */}
                        {chatLoading && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ padding: 6, borderRadius: 8, background: 'rgba(59,130,246,0.15)', flexShrink: 0, marginTop: 2 }}>
                                    <Bot size={14} color="var(--primary)" />
                                </div>
                                <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `task-bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Erro */}
                        {chatError && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, color: '#ef4444' }}>{chatError}</span>
                            </div>
                        )}
                    </div>

                    {/* Input bar */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendTaskChat()}
                            placeholder="Pergunte sobre suas tarefas..."
                            disabled={chatLoading}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={() => handleSendTaskChat()}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                                padding: '10px 14px', borderRadius: 10, border: 'none',
                                background: (chatLoading || !chatInput.trim()) ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                                color: (chatLoading || !chatInput.trim()) ? 'var(--text-dim)' : 'white',
                                cursor: (chatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                            }}
                        >
                            {chatLoading
                                ? <Loader size={16} style={{ animation: 'task-spin 1s linear infinite' }} />
                                : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Tarefa">
                <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
