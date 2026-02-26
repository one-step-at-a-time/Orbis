import React, { useState, useRef, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Typewriter from 'typewriter-effect';
import { Target, Flame, CheckCircle2, TrendingUp, Check, Plus, Trash2, Sparkles, Send, Bot, User, Loader, Settings, AlertCircle } from 'lucide-react';
import { StatsCard, ProgressBar } from '../components/Common';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewHabitModal } from '../components/Modals';
import { useAppData } from '../context/DataContext';
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
        gemini:      'orbis_gemini_key',
        openrouter:  'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key',
        zhipu:       'orbis_zhipu_key',
    };
    const key   = getStoredKey(keyMap[provider] || 'orbis_gemini_key');
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

function buildHabitContext(habits) {
    if (!habits || habits.length === 0) return 'Nenhum hábito cadastrado ainda.';

    const todayStr       = new Date().toISOString().split('T')[0];
    const completedToday = habits.filter(h => h.logs.some(l => l.data === todayStr)).length;
    const totalLogs      = habits.reduce((a, h) => a + h.logs.length, 0);
    const totalMeta      = habits.reduce((a, h) => a + h.metaMensal, 0);
    const monthRate      = totalMeta > 0 ? Math.round((totalLogs / totalMeta) * 100) : 0;

    // Streak
    const allDates = new Set(habits.flatMap(h => h.logs.map(l => l.data)));
    let streak = 0;
    const d = new Date();
    if (!allDates.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1);
    while (true) {
        const s = d.toISOString().split('T')[0];
        if (!allDates.has(s)) break;
        streak++;
        d.setDate(d.getDate() - 1);
    }

    const lines = [
        'DADOS DE HÁBITOS REAIS DO CAÇADOR:',
        `- Total de hábitos: ${habits.length}`,
        `- Completos hoje (${todayStr}): ${completedToday}/${habits.length}`,
        `- Sequência atual: ${streak} dia(s)`,
        `- Taxa mensal geral: ${monthRate}%`,
        '- Detalhes por hábito:',
    ];

    habits.forEach(h => {
        const done = h.logs.some(l => l.data === todayStr);
        const prog = h.metaMensal > 0 ? Math.round((h.logs.length / h.metaMensal) * 100) : 0;
        lines.push(`  • ${h.icone || '✨'} "${h.titulo}" | ${h.logs.length}/${h.metaMensal} logs este mês (${prog}%) | hoje: ${done ? 'FEITO' : 'PENDENTE'}`);
    });

    return lines.join('\n');
}

// ── System prompt addon ───────────────────────────────────────────────────────

const HABIT_SYSTEM_ADDON = `

MÓDULO ATIVO: ASSISTENTE DE HÁBITOS E DISCIPLINA

Você está no módulo de construção de hábitos. REGRAS OBRIGATÓRIAS:
1. SEMPRE analise os dados reais dos hábitos — cite nomes, taxas e sequências pelo nome.
2. Identifique hábitos com baixa adesão e sugira estratégias baseadas em ciência comportamental.
3. Celebre sequências (streaks) e progressos reais com entusiasmo controlado.
4. Sugira novos hábitos quando relevante, alinhados ao perfil do Caçador.
5. Seja direto e motivador. Sem asteriscos, sem markdown.

CRIAÇÃO AUTOMÁTICA DE HÁBITOS:
Quando o Caçador quiser criar um hábito (ex: "cria um hábito para X", "quero começar a Y"):
- Escreva PRIMEIRO toda a sua resposta em texto limpo.
- AO FINAL da resposta, em linha separada, emita SOMENTE o JSON:
  { "action": "CREATE_HABIT", "data": { "titulo": "...", "descricao": "...", "icone": "emoji", "metaMensal": 20 } }
- Após o JSON, em nova linha: "[ SISTEMA ]: Hábito criado — [título]."
- Escolha um emoji relevante (ex: 🏃 exercício, 📚 leitura, 💧 água, 🧘 meditação).
- metaMensal = dias por mês que o Caçador deseja praticar o hábito.
Metas sugeridas: diário=30, 5x/semana=22, 3x/semana=13, semanal=4.
`;

// ── Quick actions ─────────────────────────────────────────────────────────────

const HABIT_QUICK_ACTIONS = [
    { label: 'Minha consistência',  prompt: 'Analise minha consistência com base nos hábitos reais.' },
    { label: 'Qual melhorar?',      prompt: 'Qual hábito precisa de mais atenção? Me dê estratégias práticas.' },
    { label: 'Análise da sequência', prompt: 'Como está minha sequência atual? O que posso fazer para mantê-la?' },
    { label: 'Criar um hábito',     prompt: 'Quero criar um novo hábito. Me ajude a definir um bom objetivo.' },
    { label: 'Dicas de disciplina', prompt: 'Me dê dicas práticas de disciplina baseadas na ciência comportamental.' },
];

// ── Animações ─────────────────────────────────────────────────────────────────

const HABIT_ANIM_CSS = `
@keyframes habit-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
}
@keyframes habit-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
`;

const HABIT_COLOR = '#f59e0b';

// ── Componente principal ──────────────────────────────────────────────────────

export function HabitosPage() {
    const { habits, addHabitLog, deleteHabit, addHabit } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [habitsParent] = useAutoAnimate();
    const todayStr = new Date().toISOString().split('T')[0];

    // ── Stats ─────────────────────────────────────────────────────────────────
    const completedToday = habits.filter(h => h.logs.some(l => l.data === todayStr)).length;
    const monthRate = habits.reduce((a, h) => a + h.metaMensal, 0) > 0
        ? Math.round(habits.reduce((a, h) => a + h.logs.length, 0) / habits.reduce((a, h) => a + h.metaMensal, 0) * 100)
        : 0;

    const streak = (() => {
        if (habits.length === 0) return 0;
        const allDates = new Set(habits.flatMap(h => h.logs.map(l => l.data)));
        let count = 0;
        const d = new Date();
        if (!allDates.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1);
        while (true) {
            const s = d.toISOString().split('T')[0];
            if (!allDates.has(s)) break;
            count++;
            d.setDate(d.getDate() - 1);
        }
        return count;
    })();

    // ── Calendário ────────────────────────────────────────────────────────────
    const today      = new Date();
    const year       = today.getFullYear();
    const month      = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray  = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekdays   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const firstDay   = new Date(year, month, 1).getDay();
    const monthLabel = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('habitos');

    // ── Chat ──────────────────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useLocalStorage('orbis_habit_chat', []);
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

    // ── Handler do chat ───────────────────────────────────────────────────────
    async function handleSendHabitChat(text) {
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
            const ctx       = buildHabitContext(habits);
            const ctxPrefix = `[CONTEXTO DE HÁBITOS ATUALIZADO DO CAÇADOR]:\n${ctx}\n\n---\nPergunta: `;

            const apiMessages = [
                ...prevMessages.slice(-14),
                { ...newUserMsg, mensagem: ctxPrefix + msg },
            ];

            const response = await callAiProvider(provider, apiMessages, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: HABIT_SYSTEM_ADDON,
            });

            // Processa CREATE_HABIT
            const actions = extractActionJsons(response);
            for (const action of actions) {
                if (action.action === 'CREATE_HABIT' && action.data) {
                    const d = action.data;
                    addHabit({
                        titulo:     d.titulo     || 'Novo hábito',
                        descricao:  d.descricao  || '',
                        icone:      d.icone      || '✨',
                        metaMensal: Number(d.metaMensal) || 20,
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <style>{HABIT_ANIM_CSS}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <PageHeader title="HÁBITOS" subtitle="CONSTRUINDO DISCIPLINA DIÁRIA" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> Novo Hábito
                </button>
            </div>

            {/* Stats — sempre visíveis */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <StatsCard title="Total de Hábitos"  value={habits.length}                              icon={Target}      iconColor="var(--primary)" bgColor="rgba(59,130,246,0.1)"  />
                <StatsCard title="Sequência"          value={`${streak} dia${streak !== 1 ? 's' : ''}`} icon={Flame}       iconColor={HABIT_COLOR}    bgColor="rgba(245,158,11,0.1)" />
                <StatsCard title="Completos Hoje"     value={`${completedToday}/${habits.length}`}      icon={CheckCircle2} iconColor="#22c55e"        bgColor="rgba(34,197,94,0.1)"  />
                <StatsCard title="Taxa do Mês"        value={`${monthRate}%`}                           icon={TrendingUp}  iconColor="#06b6d4"        bgColor="rgba(6,182,212,0.1)"  />
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { id: 'habitos',   icon: <Flame    size={14} />, label: 'HÁBITOS'      },
                    { id: 'consultor', icon: <Sparkles size={14} />, label: 'CONSULTOR IA' },
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

            {/* ── HÁBITOS ── */}
            {activeTab === 'habitos' && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                    {/* Calendário */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontWeight: 600, marginBottom: 16, textTransform: 'capitalize' }}>Calendário — {monthLabel}</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                            {weekdays.map(d => (
                                <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", padding: "6px 0" }}>{d}</div>
                            ))}
                            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                            {daysArray.map(day => {
                                const isToday = day === today.getDate();
                                return (
                                    <div key={day} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: isToday ? 700 : 400, background: isToday ? "var(--primary)" : "var(--bg-secondary)", color: isToday ? "white" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}>
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lista de hábitos */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Meus Hábitos</h3>
                        <div ref={habitsParent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {habits.map(h => {
                                const done     = h.logs.some(l => l.data === todayStr);
                                const progress = h.metaMensal > 0 ? Math.min((h.logs.length / h.metaMensal) * 100, 100) : 0;
                                return (
                                    <div key={h.id} className="card" style={{ padding: 14 }}>
                                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                            <button
                                                onClick={() => addHabitLog(h.id, todayStr)}
                                                style={{ width: 32, height: 32, borderRadius: "50%", border: done ? "none" : "1px solid var(--border)", background: done ? "#22c55e" : "var(--bg-secondary)", color: done ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{h.icone} {h.titulo}</span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {done && <Flame size={14} color={HABIT_COLOR} />}
                                                        <button
                                                            className="btn-ghost"
                                                            onClick={() => deleteHabit(h.id)}
                                                            title="Excluir hábito"
                                                            style={{ padding: 4, color: "var(--text-dim)" }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {h.descricao && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{h.descricao}</p>}
                                                <div style={{ marginTop: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{h.logs.length} / {h.metaMensal} este mês</span>
                                                        <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{Math.round(progress)}%</span>
                                                    </div>
                                                    <ProgressBar value={progress} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONSULTOR IA ── */}
            {activeTab === 'consultor' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>

                    {/* Header do módulo */}
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: showConfig ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        background: `rgba(245,158,11,0.05)`,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{ padding: 6, borderRadius: 8, background: `rgba(245,158,11,0.15)`, flexShrink: 0 }}>
                            <Bot size={16} color={HABIT_COLOR} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: HABIT_COLOR, letterSpacing: 2 }}>
                                NEURAL AI — MÓDULO DE HÁBITOS
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                                Análise inteligente da sua disciplina e consistência
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
                                background: showConfig ? `rgba(245,158,11,0.2)` : 'rgba(255,255,255,0.05)',
                                color: showConfig ? HABIT_COLOR : 'var(--text-dim)',
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
                            background: `rgba(245,158,11,0.03)`,
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
                                        background: cfgSaved ? 'rgba(34,197,94,0.2)' : cfgKey.trim().length < 6 ? 'rgba(255,255,255,0.05)' : `rgba(245,158,11,0.2)`,
                                        color: cfgSaved ? '#22c55e' : cfgKey.trim().length < 6 ? 'var(--text-dim)' : HABIT_COLOR,
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
                                    <Sparkles size={28} color={HABIT_COLOR} style={{ marginBottom: 8 }} />
                                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-dim)', letterSpacing: 1 }}>
                                        O QUE DESEJA ANALISAR?
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420 }}>
                                    {HABIT_QUICK_ACTIONS.map(a => (
                                        <button
                                            key={a.label}
                                            onClick={() => handleSendHabitChat(a.prompt)}
                                            style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid rgba(245,158,11,0.3)`, background: `rgba(245,158,11,0.06)`, color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `rgba(245,158,11,0.15)`; e.currentTarget.style.color = 'var(--text)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = `rgba(245,158,11,0.06)`; e.currentTarget.style.color = 'var(--text-dim)'; }}
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
                                    <div style={{ padding: 6, borderRadius: 8, background: `rgba(245,158,11,0.15)`, flexShrink: 0, marginTop: 2 }}>
                                        <Bot size={14} color={HABIT_COLOR} />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '80%', padding: '10px 14px',
                                    borderRadius: m.tipo === 'usuario' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: m.tipo === 'usuario' ? `rgba(245,158,11,0.1)` : 'rgba(255,255,255,0.04)',
                                    border: m.tipo === 'usuario' ? `1px solid rgba(245,158,11,0.2)` : '1px solid rgba(255,255,255,0.06)',
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
                                <div style={{ padding: 6, borderRadius: 8, background: `rgba(245,158,11,0.15)`, flexShrink: 0, marginTop: 2 }}>
                                    <Bot size={14} color={HABIT_COLOR} />
                                </div>
                                <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: HABIT_COLOR, animation: `habit-bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
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
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendHabitChat()}
                            placeholder="Pergunte sobre seus hábitos..."
                            disabled={chatLoading}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={() => handleSendHabitChat()}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                                padding: '10px 14px', borderRadius: 10, border: 'none',
                                background: (chatLoading || !chatInput.trim()) ? 'rgba(255,255,255,0.05)' : HABIT_COLOR,
                                color: (chatLoading || !chatInput.trim()) ? 'var(--text-dim)' : '#000',
                                cursor: (chatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                            }}
                        >
                            {chatLoading
                                ? <Loader size={16} style={{ animation: 'habit-spin 1s linear infinite' }} />
                                : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Hábito">
                <NewHabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
