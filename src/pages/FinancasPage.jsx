import React, { useState, useRef, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Typewriter from 'typewriter-effect';
import {
    Plus, TrendingUp, TrendingDown, DollarSign,
    ArrowUpRight, ArrowDownRight, Trash2,
    List, Send, Bot, User, AlertCircle, Loader, Sparkles,
    Settings, X, Check
} from 'lucide-react';
import { StatsCard } from '../components/Common';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { NewFinanceModal } from '../components/Modals';
import { formatCurrency, formatDate } from '../utils/formatters';
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
        gemini: 'orbis_gemini_key',
        openrouter: 'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key',
        zhipu: 'orbis_zhipu_key',
    };
    const key = getStoredKey(keyMap[provider] || 'orbis_gemini_key');
    const model = getStoredKey('orbis_ai_model') || undefined;
    return { provider, key, model };
}

function buildFinanceContext(finances) {
    if (!finances || finances.length === 0) return 'Nenhum lançamento registrado ainda.';

    const despesas = finances.filter(f => f.tipo === 'despesa');
    const receitas = finances.filter(f => f.tipo === 'receita');
    const totalDespesas = despesas.reduce((s, f) => s + Number(f.valor), 0);
    const totalReceitas = receitas.reduce((s, f) => s + Number(f.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    // Top categorias de despesa
    const catTotals = {};
    despesas.forEach(f => {
        const c = f.categoria || 'outros';
        catTotals[c] = (catTotals[c] || 0) + Number(f.valor);
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const lines = [
        'DADOS FINANCEIROS REAIS DO CAÇADOR:',
        `- Receitas totais: R$${totalReceitas.toFixed(2)}`,
        `- Despesas totais: R$${totalDespesas.toFixed(2)}`,
        `- Saldo atual: ${saldo >= 0 ? '+' : ''}R$${saldo.toFixed(2)}`,
    ];

    if (topCats.length > 0) {
        lines.push('- Top categorias de gasto:');
        topCats.forEach(([cat, val]) => {
            const pct = totalDespesas > 0 ? Math.round((val / totalDespesas) * 100) : 0;
            lines.push(`  • ${cat}: R$${val.toFixed(2)} (${pct}%)`);
        });
    }

    // Últimos 10 lançamentos
    const recentes = [...finances]
        .sort((a, b) => new Date(b.data || b.created_at) - new Date(a.data || a.created_at))
        .slice(0, 10);

    if (recentes.length > 0) {
        lines.push('- Últimos lançamentos:');
        recentes.forEach(f => {
            const sinal = f.tipo === 'receita' ? '+' : '-';
            lines.push(`  • ${f.data || ''} | ${f.descricao} | ${sinal}R$${Number(f.valor).toFixed(2)} [${f.categoria || 'outros'}]`);
        });
    }

    return lines.join('\n');
}

// ── System prompt addon para o módulo financeiro ─────────────────────────────

const FINANCE_SYSTEM_ADDON = `

MÓDULO ATIVO: CONSULTOR FINANCEIRO ESPECIALIZADO

Você está no módulo de consultoria financeira pessoal. REGRAS OBRIGATÓRIAS para este módulo:

1. SEMPRE analise os dados financeiros reais fornecidos — cite valores exatos, percentuais e categorias pelo nome.
2. NUNCA dê conselhos genéricos. Todo conselho deve referenciar os números reais do Caçador.
3. Identifique padrões problemáticos: gastos excessivos por categoria, saldo negativo, ausência de reserva.
4. Sugira ações concretas com valores estimados de economia (ex: "Reduzir 20% em alimentação = R$80/mês").
5. Aplique boas práticas quando relevante: regra 50/30/20, fundo de emergência (3-6x gastos mensais), investimento automático.
6. Seja direto e prático. O Caçador quer resultados, não textos longos.

REGISTRO AUTOMÁTICO DE LANÇAMENTOS:
Quando o Caçador mencionar qualquer gasto ou receita (ex: "gastei R$50 em uber", "recebi R$3000 de salário", "paguei R$120 de conta de luz"), você DEVE:
- Emitir IMEDIATAMENTE o JSON: { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50.00, "tipo": "despesa", "categoria": "transporte", "data": "YYYY-MM-DD" } }
- Confirmar com: "[ SISTEMA ]: Lançamento registrado — [descrição] R$[valor]."
- Contextualizar em relação ao histórico (ex: "Esse gasto representa 15% do seu total de transporte.")

Categorias padrão: alimentação, transporte, moradia, saúde, lazer, educação, vestuário, serviços, outros.
`;

// ── Helpers: extrai e remove JSONs de ação da resposta da IA ─────────────────

// Percorre o texto buscando qualquer { "action": ... } com balanceamento de chaves
// Aceita qualquer espaçamento: {"action":, { "action":, etc.
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

const QUICK_ACTIONS = [
    { label: 'Analise meu mês', prompt: 'Analise minha situação financeira do mês com base nos meus dados reais.' },
    { label: 'Onde economizar?', prompt: 'Com base nos meus gastos reais, onde posso economizar mais?' },
    { label: 'Como está meu saldo?', prompt: 'Como está meu saldo? Estou no positivo ou negativo?' },
    { label: 'Maior gasto', prompt: 'Qual é minha maior categoria de gasto e o que isso representa?' },
    { label: 'Planejamento', prompt: 'Com base nos meus dados, como devo planejar meus próximos gastos?' },
];

// ── CSS de animações ──────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes fin-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
}
@keyframes fin-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
`;

// ── Componente ────────────────────────────────────────────────────────────────

export function FinancasPage() {
    const { finances, addFinance, deleteFinance } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [financesParent] = useAutoAnimate();

    // Tabs
    const [activeTab, setActiveTab] = useState('registros');

    // Chat — persiste histórico no localStorage
    const [chatMessages, setChatMessages] = useLocalStorage('orbis_finance_chat', []);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState(null);
    const [typingMsgId, setTypingMsgId] = useState(null);
    const chatScrollRef = useRef(null);
    const [autoCreated, setAutoCreated] = useState(null); // toast de lançamento auto-registrado

    // Config da IA inline no CONSULTOR
    const [showFinConfig, setShowFinConfig] = useState(false);
    const [finProvider, setFinProvider] = useState(() => getStoredKey('orbis_ai_provider') || 'siliconflow');
    const [finKey, setFinKey] = useState('');
    const [finConfigSaved, setFinConfigSaved] = useState(false);

    const FIN_KEY_MAP = {
        gemini: 'orbis_gemini_key',
        openrouter: 'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key',
        zhipu: 'orbis_zhipu_key',
    };

    function handleSaveFinConfig() {
        const k = finKey.trim();
        if (k.length < 6) return;
        window.localStorage.setItem(FIN_KEY_MAP[finProvider], JSON.stringify(k));
        window.localStorage.setItem('orbis_ai_provider', JSON.stringify(finProvider));
        setFinKey('');
        setFinConfigSaved(true);
        setChatError(null);
        setTimeout(() => { setFinConfigSaved(false); setShowFinConfig(false); }, 1200);
    }

    const receitas = finances.filter(f => f.tipo === 'receita').reduce((a, f) => a + Number(f.valor), 0);
    const despesas = finances.filter(f => f.tipo === 'despesa').reduce((a, f) => a + Number(f.valor), 0);
    const saldo = receitas - despesas;

    // Auto-scroll
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [chatMessages]);

    async function handleSendFinanceChat(text) {
        const msg = (text || chatInput).trim();
        if (!msg || chatLoading) return;
        setChatInput('');
        setChatError(null);

        const { provider, key, model } = getAiConfig();
        if (!key) {
            setShowFinConfig(true);
            setChatError(null);
            return;
        }

        const userMsgId = Date.now();
        const newUserMsg = { id: userMsgId, tipo: 'usuario', mensagem: msg };

        // Captura o array ANTES de atualizar o estado
        const prevMessages = chatMessages;
        setChatMessages(prev => [...prev, newUserMsg]);
        setChatLoading(true);

        try {
            // Injeta contexto financeiro atualizado em TODA mensagem para manter a IA atualizada
            const finCtx = buildFinanceContext(finances);
            const ctxPrefix = `[CONTEXTO FINANCEIRO ATUALIZADO DO CAÇADOR]:\n${finCtx}\n\n---\nPergunta: `;

            const apiMessages = [
                ...prevMessages,
                {
                    ...newUserMsg,
                    mensagem: ctxPrefix + msg,
                },
            ];

            const response = await callAiProvider(provider, apiMessages, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: FINANCE_SYSTEM_ADDON,
            });

            // 1. Processa CREATE_FINANCE antes de limpar — auto-registra lançamentos
            const actions = extractActionJsons(response);
            const today = new Date().toISOString().split('T')[0];
            for (const action of actions) {
                if (action.action === 'CREATE_FINANCE' && action.data) {
                    const d = action.data;
                    const entry = {
                        descricao: d.descricao || 'Lançamento via consultor',
                        valor: Math.abs(Number(d.valor) || 0),
                        tipo: d.tipo === 'receita' ? 'receita' : 'despesa',
                        categoria: d.categoria || 'outros',
                        data: d.data || today,
                    };
                    addFinance(entry);
                    setAutoCreated(entry);
                    setTimeout(() => setAutoCreated(null), 5000);
                }
            }

            // 2. Limpa resposta: remove JSONs de ação, blocos de código e asteriscos
            let clean = removeActionJsons(response);
            clean = clean
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <style>{ANIM_CSS}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <PageHeader title="FINANÇAS" subtitle="GESTÃO DE RECURSOS" />
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> Novo Lançamento
                </button>
            </div>

            {/* Stats — sempre visíveis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <StatsCard title="Receitas" value={formatCurrency(receitas)} icon={TrendingUp} iconColor="#22c55e" bgColor="rgba(34,197,94,0.1)" />
                <StatsCard title="Despesas" value={formatCurrency(despesas)} icon={TrendingDown} iconColor="#ef4444" bgColor="rgba(239,68,68,0.1)" />
                <StatsCard title="Saldo" value={formatCurrency(saldo)} icon={DollarSign} iconColor={saldo >= 0 ? '#22c55e' : '#ef4444'} bgColor={saldo >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} />
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8 }}>
                {[
                    { id: 'registros', icon: <List size={14} />, label: 'REGISTROS' },
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

            {/* ── REGISTROS ── */}
            {activeTab === 'registros' && (
                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Lançamentos Recentes</h3>
                    <div ref={financesParent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {finances.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32, fontSize: 14 }}>
                                Nenhum lançamento registrado ainda.
                            </p>
                        )}
                        {finances.map(f => (
                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, background: 'rgba(17,24,39,0.5)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ padding: 8, borderRadius: 8, background: f.tipo === 'receita' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                        {f.tipo === 'receita' ? <ArrowUpRight size={16} color="#22c55e" /> : <ArrowDownRight size={16} color="#ef4444" />}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{f.descricao}</p>
                                        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(f.data)} • {f.categoria}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: f.tipo === 'receita' ? '#22c55e' : '#ef4444' }}>
                                        {f.tipo === 'receita' ? '+' : '-'}{formatCurrency(f.valor)}
                                    </span>
                                    <button
                                        className="btn-ghost"
                                        onClick={() => deleteFinance(f.id)}
                                        title="Excluir lançamento"
                                        style={{ padding: 4, color: 'var(--text-dim)' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CONSULTOR IA ── */}
            {activeTab === 'consultor' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>

                    {/* Header do módulo */}
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: showFinConfig ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(6,182,212,0.05)',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(6,182,212,0.15)', flexShrink: 0 }}>
                            <Bot size={16} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
                                NEURAL AI — MÓDULO FINANCEIRO
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                                Análise inteligente dos seus dados financeiros reais
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
                            onClick={() => setShowFinConfig(v => !v)}
                            title="Configurar API"
                            style={{
                                padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: showFinConfig ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                                color: showFinConfig ? 'var(--accent)' : 'var(--text-dim)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Settings size={14} />
                        </button>
                    </div>

                    {/* Painel de config da API */}
                    {showFinConfig && (
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(6,182,212,0.03)',
                            display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                                CONFIGURAR CHAVE DE API
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <select
                                    value={finProvider}
                                    onChange={e => setFinProvider(e.target.value)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12,
                                        outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
                                    }}
                                >
                                    <option value="siliconflow">SiliconFlow (DeepSeek)</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="zhipu">Zhipu AI (GLM)</option>
                                </select>
                                <input
                                    type="password"
                                    value={finKey}
                                    onChange={e => setFinKey(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveFinConfig()}
                                    placeholder="Cole sua API Key aqui..."
                                    autoComplete="off"
                                    style={{
                                        flex: 1, minWidth: 180,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12,
                                        outline: 'none', fontFamily: 'inherit',
                                    }}
                                />
                                <button
                                    onClick={handleSaveFinConfig}
                                    disabled={finKey.trim().length < 6}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: finKey.trim().length < 6 ? 'not-allowed' : 'pointer',
                                        background: finConfigSaved ? 'rgba(34,197,94,0.2)' : finKey.trim().length < 6 ? 'rgba(255,255,255,0.05)' : 'rgba(6,182,212,0.2)',
                                        color: finConfigSaved ? '#22c55e' : finKey.trim().length < 6 ? 'var(--text-dim)' : 'var(--accent)',
                                        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.2s', fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                >
                                    {finConfigSaved ? <><Check size={13} /> SALVO</> : 'SALVAR'}
                                </button>
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                A chave é salva localmente no seu navegador. Recomendado: SiliconFlow com DeepSeek V3 (gratuito).
                            </p>
                        </div>
                    )}

                    {/* Área de mensagens */}
                    <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* Estado vazio: chips */}
                        {chatMessages.length === 0 && !chatLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Sparkles size={28} color="var(--accent)" style={{ marginBottom: 8 }} />
                                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-dim)', letterSpacing: 1 }}>
                                        O QUE DESEJA ANALISAR?
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
                                    {QUICK_ACTIONS.map(a => (
                                        <button
                                            key={a.label}
                                            onClick={() => handleSendFinanceChat(a.prompt)}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: 20,
                                                border: '1px solid rgba(6,182,212,0.3)',
                                                background: 'rgba(6,182,212,0.06)',
                                                color: 'var(--text-dim)',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontFamily: 'inherit',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.06)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mensagens */}
                        {chatMessages.map(m => (
                            <div
                                key={m.id}
                                style={{
                                    display: 'flex', gap: 10, alignItems: 'flex-start',
                                    justifyContent: m.tipo === 'usuario' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                {m.tipo === 'ia' && (
                                    <div style={{ padding: 6, borderRadius: 8, background: 'rgba(6,182,212,0.15)', flexShrink: 0, marginTop: 2 }}>
                                        <Bot size={14} color="var(--accent)" />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: m.tipo === 'usuario' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: m.tipo === 'usuario' ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: m.tipo === 'usuario' ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: 13,
                                    lineHeight: 1.65,
                                    color: 'var(--text)',
                                }}>
                                    {m.tipo === 'ia' && m.id === typingMsgId ? (
                                        <Typewriter
                                            key={m.id}
                                            options={{ delay: 10, cursor: '▮' }}
                                            onInit={tw => {
                                                tw.typeString(m.mensagem)
                                                    .callFunction(() => setTypingMsgId(null))
                                                    .start();
                                            }}
                                        />
                                    ) : (
                                        <span style={{ whiteSpace: 'pre-wrap' }}>{m.mensagem}</span>
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
                                <div style={{ padding: 6, borderRadius: 8, background: 'rgba(6,182,212,0.15)', flexShrink: 0, marginTop: 2 }}>
                                    <Bot size={14} color="var(--accent)" />
                                </div>
                                <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--accent)',
                                            animation: `fin-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Toast: lançamento auto-registrado */}
                        {autoCreated && (
                            <div style={{
                                display: 'flex', gap: 8, alignItems: 'center',
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(34,197,94,0.08)',
                                border: '1px solid rgba(34,197,94,0.25)',
                                animation: 'fin-bounce 0.4s ease-out',
                            }}>
                                <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: '#22c55e' }}>
                                    Lançamento registrado automaticamente — {autoCreated.tipo === 'receita' ? '+' : '-'}R${Number(autoCreated.valor).toFixed(2)} · {autoCreated.descricao}
                                </span>
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
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendFinanceChat()}
                            placeholder="Pergunte sobre suas finanças..."
                            disabled={chatLoading}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                color: 'var(--text)',
                                fontSize: 13,
                                outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />
                        <button
                            onClick={() => handleSendFinanceChat()}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: (chatLoading || !chatInput.trim()) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                color: (chatLoading || !chatInput.trim()) ? 'var(--text-dim)' : '#000',
                                cursor: (chatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            {chatLoading
                                ? <Loader size={16} style={{ animation: 'fin-spin 1s linear infinite' }} />
                                : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento">
                <NewFinanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
