import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Typewriter from 'typewriter-effect';
import {
    Plus, TrendingUp, TrendingDown, DollarSign,
    ArrowUpRight, ArrowDownRight, Trash2,
    List, Send, Bot, User, AlertCircle, Loader, Sparkles,
    Settings, X, Check, BarChart2, Search, Filter
} from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
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
- Escreva PRIMEIRO toda a sua análise/resposta em texto limpo.
- AO FINAL da resposta, em linha separada, emita SOMENTE o JSON (sem texto antes ou depois na mesma linha):
  { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50.00, "tipo": "despesa", "categoria": "transporte", "data": "YYYY-MM-DD" } }
- Após o JSON, em nova linha, confirme: "[ SISTEMA ]: Lançamento registrado — [descrição] R$[valor]."
- Contextualize em relação ao histórico (ex: "Esse gasto representa 15% do seu total de transporte.")

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

// Limpeza completa de uma mensagem da IA para exibição
// Garante que nenhum JSON, bloco de código ou markdown vaze para o chat
function cleanIaMsg(text) {
    if (!text) return '';
    let t = removeActionJsons(text);
    // Remove blocos de código markdown (```...```)
    t = t.replace(/```json[\s\S]*?```/gi, '');
    t = t.replace(/```[\s\S]*?```/g, '');
    // Fallback: remove qualquer linha que seja apenas um bloco JSON solto
    // (começa com { e termina com } na mesma "seção")
    t = t.replace(/^\s*\{[^]*?\}\s*$/gm, '');
    // Remove asteriscos e headers markdown
    t = t.replace(/\*/g, '');
    t = t.replace(/#{1,6}\s+/g, '');
    // Normaliza linhas em branco extras
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
}

const QUICK_ACTIONS = [
    { label: 'Analise meu mês', prompt: 'Analise minha situação financeira do mês com base nos meus dados reais.' },
    { label: 'Onde economizar?', prompt: 'Com base nos meus gastos reais, onde posso economizar mais?' },
    { label: 'Como está meu saldo?', prompt: 'Como está meu saldo? Estou no positivo ou negativo?' },
    { label: 'Maior gasto', prompt: 'Qual é minha maior categoria de gasto e o que isso representa?' },
    { label: 'Planejamento', prompt: 'Com base nos meus dados, como devo planejar meus próximos gastos?' },
];

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#3b82f6', '#64748b'];

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

    // Filtros da aba Registros
    const [filterText, setFilterText] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [filterCat, setFilterCat] = useState('');

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

    const { receitas, despesas, saldo } = useMemo(() => {
        const r = finances.filter(f => f.tipo === 'receita').reduce((a, f) => a + Number(f.valor), 0);
        const d = finances.filter(f => f.tipo === 'despesa').reduce((a, f) => a + Number(f.valor), 0);
        return { receitas: r, despesas: d, saldo: r - d };
    }, [finances]);

    // Categorias únicas para filtro
    const categories = useMemo(() =>
        [...new Set(finances.map(f => f.categoria).filter(Boolean))].sort()
    , [finances]);

    // Lançamentos filtrados (aba Registros) — mais recente primeiro
    const filteredFinances = useMemo(() => {
        return finances
            .filter(f => {
                if (filterTipo && f.tipo !== filterTipo) return false;
                if (filterCat && f.categoria !== filterCat) return false;
                if (filterText) {
                    const txt = filterText.toLowerCase();
                    if (!(f.descricao || '').toLowerCase().includes(txt) &&
                        !(f.categoria || '').toLowerCase().includes(txt)) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    }, [finances, filterText, filterTipo, filterCat]);

    // Dados mensais para gráfico de barras (últimos 6 meses)
    const monthlyData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            const r = finances.filter(f => f.tipo === 'receita' && (f.data || '').startsWith(key))
                .reduce((a, f) => a + Number(f.valor), 0);
            const dx = finances.filter(f => f.tipo === 'despesa' && (f.data || '').startsWith(key))
                .reduce((a, f) => a + Number(f.valor), 0);
            return { mes: label.charAt(0).toUpperCase() + label.slice(1), receitas: r, despesas: dx };
        });
    }, [finances]);

    // Dados por categoria para gráfico de pizza
    const catData = useMemo(() => {
        const map = {};
        finances.filter(f => f.tipo === 'despesa').forEach(f => {
            const cat = f.categoria || 'outros';
            map[cat] = (map[cat] || 0) + Number(f.valor);
        });
        if (Object.keys(map).length === 0) return [];
        const total = Object.values(map).reduce((a, v) => a + v, 0);
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], i) => ({
                name,
                value,
                pct: total > 0 ? Math.round((value / total) * 100) : 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }));
    }, [finances]);

    // Sanitiza mensagens antigas que possam ter JSON exposto (migração)
    useEffect(() => {
        const hasJson = chatMessages.some(
            m => m.tipo === 'ia' && /\{\s*"action"\s*:/.test(m.mensagem)
        );
        if (hasJson) {
            setChatMessages(prev => prev.map(m => {
                if (m.tipo !== 'ia') return m;
                const cleaned = removeActionJsons(m.mensagem)
                    .replace(/```json[\s\S]*?```/g, '')
                    .replace(/```[\s\S]*?```/g, '')
                    .replace(/\*/g, '')
                    .trim();
                return { ...m, mensagem: cleaned };
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

            // Limita a 14 mensagens (7 trocas) para controlar uso de tokens e evitar erros de cota
            const apiMessages = [
                ...prevMessages.slice(-14),
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
                    // Deduplicação: ignora se já existe lançamento idêntico (mesmo valor, tipo e descrição)
                    const isDuplicate = finances.some(f =>
                        Math.abs(Number(f.valor) - entry.valor) < 0.01 &&
                        f.tipo === entry.tipo &&
                        (f.descricao || '').toLowerCase().trim() === (entry.descricao || '').toLowerCase().trim()
                    );
                    if (!isDuplicate) {
                        addFinance(entry);
                        setAutoCreated(entry);
                        setTimeout(() => setAutoCreated(null), 5000);
                    }
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { id: 'registros', icon: <List size={14} />, label: 'REGISTROS' },
                    { id: 'consultor', icon: <Sparkles size={14} />, label: 'CONSULTOR IA' },
                    { id: 'analise', icon: <BarChart2 size={14} />, label: 'ANÁLISE' },
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
                    {/* Barra de filtros */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                placeholder="Buscar descrição..."
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 8, padding: '7px 10px 7px 30px',
                                    color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit',
                                }}
                            />
                        </div>
                        <select
                            value={filterTipo}
                            onChange={e => setFilterTipo(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 8, padding: '7px 10px', color: filterTipo ? 'var(--text)' : 'var(--text-dim)',
                                fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <option value="">Todos os tipos</option>
                            <option value="receita">Receitas</option>
                            <option value="despesa">Despesas</option>
                        </select>
                        <select
                            value={filterCat}
                            onChange={e => setFilterCat(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 8, padding: '7px 10px', color: filterCat ? 'var(--text)' : 'var(--text-dim)',
                                fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <option value="">Todas categorias</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {(filterText || filterTipo || filterCat) && (
                            <button
                                onClick={() => { setFilterText(''); setFilterTipo(''); setFilterCat(''); }}
                                style={{
                                    padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                                }}
                            >
                                <X size={11} /> LIMPAR
                            </button>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                            {filteredFinances.length}/{finances.length}
                        </span>
                    </div>

                    {/* Lista */}
                    <div ref={financesParent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {finances.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32, fontSize: 14 }}>
                                Nenhum lançamento registrado ainda.
                            </p>
                        )}
                        {finances.length > 0 && filteredFinances.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24, fontSize: 14 }}>
                                Nenhum lançamento encontrado com os filtros selecionados.
                            </p>
                        )}
                        {filteredFinances.map(f => (
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

            {/* ── ANÁLISE ── */}
            {activeTab === 'analise' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {finances.length === 0 && (
                        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                            <BarChart2 size={32} color="var(--text-dim)" style={{ marginBottom: 12, margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Registre lançamentos para ver as análises gráficas.</p>
                        </div>
                    )}

                    {finances.length > 0 && (
                        <>
                            {/* Gráfico de barras — mensal */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <BarChart2 size={16} color="var(--accent)" />
                                    <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                                        RECEITAS vs DESPESAS — ÚLTIMOS 6 MESES
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> Receitas
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} /> Despesas
                                    </span>
                                </div>
                                <div style={{ height: 240 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} barGap={4} barSize={18}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tick={{ fill: 'var(--text-dim)' }} />
                                            <YAxis stroke="#64748b" fontSize={11} tick={{ fill: 'var(--text-dim)' }}
                                                tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                                            <Tooltip
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}
                                                formatter={(v, name) => [`R$ ${Number(v).toFixed(2).replace('.', ',')}`, name === 'receitas' ? 'Receitas' : 'Despesas']}
                                                labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
                                            />
                                            <Bar dataKey="receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Gráfico de pizza — categorias */}
                            {catData.length > 0 && (
                                <div className="card" style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                        <Filter size={16} color="var(--accent)" />
                                        <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                                            DESPESAS POR CATEGORIA
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                                        <div style={{ flex: '0 0 200px', height: 200 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={catData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={55} outerRadius={80}
                                                        paddingAngle={3} dataKey="value"
                                                    >
                                                        {catData.map((entry, index) => (
                                                            <Cell key={index} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}
                                                        formatter={(v) => [`R$ ${Number(v).toFixed(2).replace('.', ',')}`, 'Valor']}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                                            {catData.map(c => (
                                                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                                                    <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1, textTransform: 'capitalize' }}>{c.name}</span>
                                                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>
                                                        {formatCurrency(c.value)}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: c.color, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
                                                        {c.pct}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento">
                <NewFinanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
