import React, { useState, useRef, useEffect } from 'react';
import Typewriter from 'typewriter-effect';
import {
    BookOpen, PenLine, Brain, Plus, Trash2, Mic, MicOff,
    X, Sparkles, Bot, User, Send, Loader, Settings, Check,
    AlertCircle, Search, Calendar, ChevronLeft, Wand2
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { callAiProvider } from '../services/aiProviderService';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    isSupabaseConfigured,
    syncNote, deleteNoteSupabase,
    syncDiaryEntry, deleteDiaryEntrySupabase,
    fetchNotes, fetchDiaryEntries,
} from '../services/supabaseService';

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
        gemini: 'orbis_gemini_key', openrouter: 'orbis_openrouter_key',
        siliconflow: 'orbis_siliconflow_key', zhipu: 'orbis_zhipu_key',
    };
    const key   = getStoredKey(keyMap[provider] || 'orbis_gemini_key');
    const model = getStoredKey('orbis_ai_model') || undefined;
    return { provider, key, model };
}

// Fire-and-forget sync (mesmo padrão do DataContext)
function bg(fn) {
    if (isSupabaseConfigured()) fn().catch(console.error);
}

function _findActionJsonSpans(text) {
    const spans = [], marker = /\{\s*"action"\s*:/g;
    let match;
    while ((match = marker.exec(text)) !== null) {
        const start = match.index;
        let depth = 0, j = start;
        while (j < text.length) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') { depth--; if (depth === 0) { spans.push([start, j + 1]); break; } }
            j++;
        }
    }
    return spans;
}

function removeActionJsons(text) {
    const spans = _findActionJsonSpans(text);
    if (!spans.length) return text;
    let result = '', last = 0;
    for (const [s, e] of spans) { result += text.slice(last, s); last = e; }
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

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── System prompts ────────────────────────────────────────────────────────────

const BRAINSTORM_SYSTEM_ADDON = `

MÓDULO ATIVO: ESPELHO INTELIGENTE E REFLEXÃO PESSOAL

Você está no modo de brainstorming e organização de pensamentos. REGRAS OBRIGATÓRIAS:
1. Quando o Caçador compartilhar pensamentos desestruturados ou um desabafo:
   - Primeiro: acolha com empatia genuína (1-2 frases).
   - Depois: organize e estruture o que foi dito com clareza.
   - Por fim: aponte 2-3 insights, padrões ou perguntas reflexivas.
2. Identifique temas recorrentes: "Percebo que você menciona X com frequência..."
3. Faça perguntas abertas para aprofundar reflexões quando útil.
4. Seja como um espelho inteligente: devolva os pensamentos de forma mais clara e estruturada.
5. Tom: acolhedor, curioso, sem julgamento. Como um terapeuta-estrategista de confiança.
6. Sem asteriscos, sem markdown. Listas com hífen quando necessário.
`;

const STRUCTURE_SYSTEM_ADDON = `

MODO: ESTRUTURAÇÃO E CLAREZA DE TEXTO

Sua tarefa é organizar o texto a seguir de forma clara e estruturada. REGRAS:
- Preserve a essência, voz e intenção do original.
- Adicione estrutura lógica: ideias principais, pontos de apoio, conclusões.
- Identifique padrões, temas ou insights implícitos.
- Seja conciso: máximo 80% do tamanho original.
- Tom neutro e claro.
- Sem asteriscos, sem markdown, sem headers com #.
- Responda em português.
`;

// ── Constantes visuais ────────────────────────────────────────────────────────

const LYRA_COLOR = '#8b5cf6';
const CFG_KEY_MAP = {
    gemini: 'orbis_gemini_key', openrouter: 'orbis_openrouter_key',
    siliconflow: 'orbis_siliconflow_key', zhipu: 'orbis_zhipu_key',
};

const CADERNO_ANIM_CSS = `
@keyframes cd-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
}
@keyframes cd-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
`;

// ── LYRAAvatar (reutilizável) ──────────────────────────────────────────────────

function LyraAvatar({ size = 28 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
            boxShadow: '0 0 10px rgba(139,92,246,0.4)',
        }}>
            <span style={{ fontSize: size * 0.42, fontWeight: 800, color: 'white', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>L</span>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CadernoPage() {
    // ── Tabs ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('anotacoes');

    // ── ANOTAÇÕES ─────────────────────────────────────────────────────────────
    const [notes, setNotes]         = useLocalStorage('orbis_notes', []);
    const [editingNote, setEditingNote] = useState(null); // null=list, 'new'=new, id=edit
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteSearch, setNoteSearch] = useState('');
    const [structuringNote, setStructuringNote] = useState(false);
    const noteTitleRef   = useRef(null);
    const noteContentRef = useRef(null);

    // ── DIÁRIO ────────────────────────────────────────────────────────────────
    const [diary, setDiary]              = useLocalStorage('orbis_diary', []);
    const [diaryContent, setDiaryContent] = useState('');
    const [selectedDay, setSelectedDay]   = useState(todayStr());
    const [structuringDiary, setStructuringDiary] = useState(false);
    const diaryRef = useRef(null);

    // ── BRAINSTORM ────────────────────────────────────────────────────────────
    const [bMsgs, setBMsgs]      = useLocalStorage('orbis_brainstorm_chat', []);
    const [bInput, setBInput]     = useState('');
    const [bLoading, setBLoading] = useState(false);
    const [bError, setBError]     = useState(null);
    const [typingId, setTypingId] = useState(null);
    const bScrollRef = useRef(null);

    // ── Voice (compartilhado) ─────────────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [voiceTarget, setVoiceTarget] = useState(null); // 'note'|'diary'|'brainstorm'
    const recognitionRef = useRef(null);

    // ── Config ────────────────────────────────────────────────────────────────
    const [showConfig,  setShowConfig]  = useState(false);
    const [cfgProvider, setCfgProvider] = useState(() => getStoredKey('orbis_ai_provider') || 'siliconflow');
    const [cfgKey,      setCfgKey]      = useState('');
    const [cfgSaved,    setCfgSaved]    = useState(false);

    function handleSaveConfig() {
        const k = cfgKey.trim();
        if (k.length < 6) return;
        window.localStorage.setItem(CFG_KEY_MAP[cfgProvider], JSON.stringify(k));
        window.localStorage.setItem('orbis_ai_provider', JSON.stringify(cfgProvider));
        setCfgKey(''); setCfgSaved(true); setBError(null);
        setTimeout(() => { setCfgSaved(false); setShowConfig(false); }, 1200);
    }

    // Auto-scroll brainstorm
    useEffect(() => {
        if (bScrollRef.current) {
            bScrollRef.current.scrollTo({ top: bScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [bMsgs]);

    // Carrega conteúdo do dia selecionado no diário
    useEffect(() => {
        const entry = diary.find(e => e.data === selectedDay);
        setDiaryContent(entry?.conteudo || '');
    }, [selectedDay, diary]);

    // Focus no título ao criar nova nota
    useEffect(() => {
        if (editingNote === 'new') setTimeout(() => noteTitleRef.current?.focus(), 50);
    }, [editingNote]);

    // Hydration inicial do Supabase (recupera dados se localStorage vazio)
    useEffect(() => {
        if (!isSupabaseConfigured()) return;
        if (notes.length === 0) {
            fetchNotes().then(remote => {
                if (remote.length > 0) setNotes(remote);
            }).catch(console.error);
        }
        if (diary.length === 0) {
            fetchDiaryEntries().then(remote => {
                if (remote.length > 0) setDiary(remote);
            }).catch(console.error);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Voice ─────────────────────────────────────────────────────────────────
    function toggleVoice(target) {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            setVoiceTarget(null);
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert('Reconhecimento de voz não disponível. Use Chrome ou Edge.'); return; }
        const rec = new SR();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        let interim = '';
        rec.onresult = (e) => {
            let final = '', int = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += t + ' ';
                else int += t;
            }
            interim = int;
            if (final) {
                if (target === 'note')       setNoteContent(prev => prev + (prev ? '\n' : '') + final.trim());
                if (target === 'diary')      setDiaryContent(prev => prev + (prev ? '\n' : '') + final.trim());
                if (target === 'brainstorm') setBInput(prev => prev + (prev ? ' ' : '') + final.trim());
            }
        };
        rec.onend = () => { setIsListening(false); setVoiceTarget(null); };
        rec.start();
        setIsListening(true);
        setVoiceTarget(target);
    }

    // ── ANOTAÇÕES handlers ────────────────────────────────────────────────────
    function openNewNote() {
        setNoteTitle(''); setNoteContent('');
        setEditingNote('new');
    }

    function openEditNote(note) {
        setNoteTitle(note.titulo); setNoteContent(note.conteudo);
        setEditingNote(note.id);
    }

    function saveNote() {
        const titulo   = noteTitle.trim() || 'Sem título';
        const conteudo = noteContent.trim();
        if (!conteudo && !noteTitle.trim()) return;

        if (editingNote === 'new') {
            const saved = { id: newId(), titulo, conteudo, createdAt: new Date().toISOString() };
            setNotes(prev => [saved, ...prev]);
            bg(() => syncNote(saved));
        } else {
            const updated = { id: editingNote, titulo, conteudo, updatedAt: new Date().toISOString() };
            setNotes(prev => prev.map(n => n.id === editingNote ? { ...n, ...updated } : n));
            bg(() => syncNote(updated));
        }
        setEditingNote(null);
    }

    function deleteNote(id) {
        if (!window.confirm('Excluir esta anotação?')) return;
        setNotes(prev => prev.filter(n => n.id !== id));
        if (editingNote === id) setEditingNote(null);
        bg(() => deleteNoteSupabase(id));
    }

    async function handleStructureNote() {
        const { provider, key, model } = getAiConfig();
        if (!key) { setShowConfig(true); return; }
        if (!noteContent.trim()) return;
        setStructuringNote(true);
        try {
            const prompt = `Organize e estruture o seguinte texto:\n\n${noteContent}`;
            const msgs = [{ tipo: 'usuario', mensagem: prompt }];
            const result = await callAiProvider(provider, msgs, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: STRUCTURE_SYSTEM_ADDON,
            });
            setNoteContent(cleanIaMsg(result));
        } catch (e) {
            alert('Erro ao estruturar: ' + (e.message || 'tente novamente'));
        } finally {
            setStructuringNote(false);
        }
    }

    // ── DIÁRIO handlers ───────────────────────────────────────────────────────
    function saveDiaryEntry() {
        if (!diaryContent.trim()) return;
        const existing = diary.find(e => e.data === selectedDay);
        if (existing) {
            const updated = { ...existing, conteudo: diaryContent, updatedAt: new Date().toISOString() };
            setDiary(prev => prev.map(e => e.data === selectedDay ? updated : e));
            bg(() => syncDiaryEntry(updated));
        } else {
            const saved = { id: newId(), data: selectedDay, conteudo: diaryContent, createdAt: new Date().toISOString() };
            setDiary(prev => [saved, ...prev]);
            bg(() => syncDiaryEntry(saved));
        }
    }

    async function handleStructureDiary() {
        const { provider, key, model } = getAiConfig();
        if (!key) { setShowConfig(true); return; }
        if (!diaryContent.trim()) return;
        setStructuringDiary(true);
        try {
            const prompt = `Esta é uma entrada de diário de ${fmtDate(selectedDay)}. Organize e traga clareza:\n\n${diaryContent}`;
            const msgs = [{ tipo: 'usuario', mensagem: prompt }];
            const result = await callAiProvider(provider, msgs, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: STRUCTURE_SYSTEM_ADDON,
            });
            setDiaryContent(cleanIaMsg(result));
        } catch (e) {
            alert('Erro ao estruturar: ' + (e.message || 'tente novamente'));
        } finally {
            setStructuringDiary(false);
        }
    }

    // ── BRAINSTORM handler ────────────────────────────────────────────────────
    async function handleSendBrainstorm(text) {
        const msg = (text || bInput).trim();
        if (!msg || bLoading) return;
        setBInput(''); setBError(null);

        const { provider, key, model } = getAiConfig();
        if (!key) { setShowConfig(true); return; }

        const userMsgId  = Date.now();
        const newUserMsg = { id: userMsgId, tipo: 'usuario', mensagem: msg };
        const prevMsgs   = bMsgs;
        setBMsgs(prev => [...prev, newUserMsg]);
        setBLoading(true);

        try {
            const apiMessages = [
                ...prevMsgs.slice(-12),
                { ...newUserMsg },
            ];
            const response = await callAiProvider(provider, apiMessages, key, {
                ...(model ? { model } : {}),
                systemPromptAddon: BRAINSTORM_SYSTEM_ADDON,
            });
            const clean = cleanIaMsg(response);
            const aiId  = Date.now() + 1;
            setBMsgs(prev => [...prev, { id: aiId, tipo: 'ia', mensagem: clean }]);
            setTypingId(aiId);
        } catch (err) {
            setBError(err.message || 'Erro ao contactar LYRA.');
        } finally {
            setBLoading(false);
        }
    }

    // ── Filtro de notas ───────────────────────────────────────────────────────
    const filteredNotes = notes.filter(n => {
        if (!noteSearch) return true;
        const q = noteSearch.toLowerCase();
        return (n.titulo || '').toLowerCase().includes(q) || (n.conteudo || '').toLowerCase().includes(q);
    });

    // ── Dias do diário ────────────────────────────────────────────────────────
    const diaryDays = [...new Set([todayStr(), ...diary.map(e => e.data)])].sort((a, b) => b.localeCompare(a));

    // ── Input style helper ────────────────────────────────────────────────────
    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '10px 14px', color: 'var(--text)',
        fontSize: 13, outline: 'none', fontFamily: 'inherit',
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <style>{CADERNO_ANIM_CSS}</style>

            {/* Header */}
            <PageHeader title="CADERNO" subtitle="ANOTAÇÕES, DIÁRIO E REFLEXÕES" />

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { id: 'anotacoes', icon: <PenLine    size={14} />, label: 'ANOTAÇÕES'     },
                    { id: 'diario',    icon: <BookOpen   size={14} />, label: 'DIÁRIO'         },
                    { id: 'brainstorm',icon: <Brain      size={14} />, label: 'BRAINSTORM IA'  },
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

            {/* ── ANOTAÇÕES ── */}
            {activeTab === 'anotacoes' && (
                <>
                    {editingNote ? (
                        /* Editor de nota */
                        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Toolbar editor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={() => setEditingNote(null)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                >
                                    <ChevronLeft size={14} /> Voltar
                                </button>
                                <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {editingNote === 'new' ? 'NOVA ANOTAÇÃO' : 'EDITANDO'}
                                </span>
                                <button
                                    onClick={() => toggleVoice('note')}
                                    title={isListening && voiceTarget === 'note' ? 'Parar gravação' : 'Gravar por voz'}
                                    style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: isListening && voiceTarget === 'note' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: isListening && voiceTarget === 'note' ? '#ef4444' : 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                >
                                    {isListening && voiceTarget === 'note' ? <MicOff size={15} /> : <Mic size={15} />}
                                </button>
                                <button
                                    onClick={handleStructureNote}
                                    disabled={structuringNote || !noteContent.trim()}
                                    title="Estruturar com LYRA"
                                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: structuringNote || !noteContent.trim() ? 'not-allowed' : 'pointer', background: `rgba(139,92,246,0.12)`, color: LYRA_COLOR, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
                                >
                                    {structuringNote ? <Loader size={13} style={{ animation: 'cd-spin 1s linear infinite' }} /> : <Wand2 size={13} />}
                                    Estruturar
                                </button>
                                <button
                                    onClick={saveNote}
                                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
                                >
                                    <Check size={13} /> Salvar
                                </button>
                            </div>

                            <input
                                ref={noteTitleRef}
                                type="text"
                                value={noteTitle}
                                onChange={e => setNoteTitle(e.target.value)}
                                placeholder="Título da anotação..."
                                style={{ ...inputStyle, fontSize: 15, fontWeight: 600, padding: '12px 14px' }}
                            />
                            <textarea
                                ref={noteContentRef}
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                placeholder={isListening && voiceTarget === 'note' ? '🎙️ Gravando...' : 'Escreva livremente. Pode ser rascunho, resumo de estudo, ideias, links...'}
                                style={{ ...inputStyle, minHeight: 320, resize: 'vertical', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                            />
                            {isListening && voiceTarget === 'note' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'cd-bounce 1s infinite' }} />
                                    <span style={{ fontSize: 12, color: '#ef4444' }}>Gravando — fale livremente. Clique no microfone para parar.</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Lista de notas */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Search + new */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        value={noteSearch}
                                        onChange={e => setNoteSearch(e.target.value)}
                                        placeholder="Buscar anotações..."
                                        style={{ ...inputStyle, paddingLeft: 30 }}
                                    />
                                </div>
                                <button
                                    onClick={openNewNote}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                                >
                                    <Plus size={14} /> Nova Nota
                                </button>
                            </div>

                            {/* Cards */}
                            {filteredNotes.length === 0 ? (
                                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                                    <PenLine size={32} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
                                    <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                                        {noteSearch ? 'Nenhuma nota encontrada.' : 'Nenhuma anotação ainda. Comece criando uma!'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                    {filteredNotes.map(note => (
                                        <div
                                            key={note.id}
                                            className="card"
                                            style={{ padding: 16, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                                            onClick={() => openEditNote(note)}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{note.titulo || 'Sem título'}</h4>
                                                <button
                                                    onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                                                    style={{ padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-dim)', flexShrink: 0, opacity: 0.6 }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            {note.conteudo && (
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {note.conteudo}
                                                </p>
                                            )}
                                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
                                                {fmtDate(note.updatedAt || note.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── DIÁRIO ── */}
            {activeTab === 'diario' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {/* Editor do dia */}
                    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Date picker simples */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Calendar size={16} color="var(--accent)" />
                            <input
                                type="date"
                                value={selectedDay}
                                max={todayStr()}
                                onChange={e => { saveDiaryEntry(); setSelectedDay(e.target.value); }}
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13, color: selectedDay === todayStr() ? 'var(--accent)' : 'var(--text-dim)', fontWeight: selectedDay === todayStr() ? 700 : 400 }}>
                                {selectedDay === todayStr() ? 'Hoje' : fmtDate(selectedDay)}
                            </span>
                        </div>

                        {/* Toolbar */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => toggleVoice('diary')}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isListening && voiceTarget === 'diary' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: isListening && voiceTarget === 'diary' ? '#ef4444' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                            >
                                {isListening && voiceTarget === 'diary' ? <><MicOff size={13} /> Parar</> : <><Mic size={13} /> Falar</>}
                            </button>
                            <button
                                onClick={handleStructureDiary}
                                disabled={structuringDiary || !diaryContent.trim()}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: structuringDiary || !diaryContent.trim() ? 'not-allowed' : 'pointer', background: `rgba(139,92,246,0.12)`, color: LYRA_COLOR, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
                            >
                                {structuringDiary ? <Loader size={13} style={{ animation: 'cd-spin 1s linear infinite' }} /> : <Wand2 size={13} />}
                                LYRA estrutura
                            </button>
                            <button
                                onClick={saveDiaryEntry}
                                disabled={!diaryContent.trim()}
                                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: !diaryContent.trim() ? 'not-allowed' : 'pointer', background: diaryContent.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: diaryContent.trim() ? '#000' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}
                            >
                                <Check size={13} /> Salvar
                            </button>
                        </div>

                        {isListening && voiceTarget === 'diary' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'cd-bounce 1s infinite' }} />
                                <span style={{ fontSize: 12, color: '#ef4444' }}>Gravando — fale livremente. Clique em "Parar" quando terminar.</span>
                            </div>
                        )}

                        <textarea
                            ref={diaryRef}
                            value={diaryContent}
                            onChange={e => setDiaryContent(e.target.value)}
                            placeholder={isListening && voiceTarget === 'diary' ? '🎙️ Gravando...' : 'Como foi seu dia? O que você sentiu, aprendeu, pensou?\n\nPode ser livre, sem julgamento. Este é seu espaço.'}
                            style={{ ...inputStyle, minHeight: 280, resize: 'vertical', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}
                        />
                    </div>

                    {/* Histórico */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, color: 'var(--text-dim)' }}>
                            ENTRADAS ANTERIORES
                        </h3>
                        {diary.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                                Nenhuma entrada ainda. Comece escrevendo hoje!
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                                {diary
                                    .sort((a, b) => b.data.localeCompare(a.data))
                                    .map(entry => (
                                        <div
                                            key={entry.id}
                                            onClick={() => setSelectedDay(entry.data)}
                                            style={{ padding: 12, borderRadius: 10, background: selectedDay === entry.data ? `rgba(139,92,246,0.1)` : 'rgba(17,24,39,0.4)', border: selectedDay === entry.data ? `1px solid rgba(139,92,246,0.3)` : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: selectedDay === entry.data ? LYRA_COLOR : 'var(--text)' }}>
                                                    {entry.data === todayStr() ? 'Hoje' : fmtDate(entry.data)}
                                                </span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (window.confirm('Excluir esta entrada?')) setDiary(prev => prev.filter(d => d.id !== entry.id)); }}
                                                    style={{ padding: 3, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-dim)', opacity: 0.5 }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                                                {entry.conteudo}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── BRAINSTORM IA ── */}
            {activeTab === 'brainstorm' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 560 }}>

                    {/* Header */}
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: showConfig ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        background: `rgba(139,92,246,0.05)`,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <LyraAvatar size={32} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: LYRA_COLOR, letterSpacing: 2 }}>
                                LYRA — BRAINSTORM & REFLEXÃO
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                                Desabafe, pense em voz alta ou faça brainstorm — LYRA organiza e traz clareza
                            </p>
                        </div>
                        {bMsgs.length > 0 && (
                            <button
                                onClick={() => { if (window.confirm('Limpar conversa?')) setBMsgs([]); }}
                                title="Limpar conversa"
                                style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowConfig(v => !v)}
                            style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: showConfig ? `rgba(139,92,246,0.2)` : 'rgba(255,255,255,0.05)', color: showConfig ? LYRA_COLOR : 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                        >
                            <Settings size={14} />
                        </button>
                    </div>

                    {/* Config panel */}
                    {showConfig && (
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: `rgba(139,92,246,0.03)`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>CONFIGURAR CHAVE DE API</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <select value={cfgProvider} onChange={e => setCfgProvider(e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <option value="siliconflow">SiliconFlow (DeepSeek)</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="zhipu">Zhipu AI (GLM)</option>
                                </select>
                                <input type="password" value={cfgKey} onChange={e => setCfgKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveConfig()} placeholder="Cole sua API Key aqui..." autoComplete="off" style={{ flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                                <button onClick={handleSaveConfig} disabled={cfgKey.trim().length < 6} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: cfgKey.trim().length < 6 ? 'not-allowed' : 'pointer', background: cfgSaved ? 'rgba(34,197,94,0.2)' : cfgKey.trim().length < 6 ? 'rgba(255,255,255,0.05)' : `rgba(139,92,246,0.2)`, color: cfgSaved ? '#22c55e' : cfgKey.trim().length < 6 ? 'var(--text-dim)' : LYRA_COLOR, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                                    {cfgSaved ? <><Check size={13} /> SALVO</> : 'SALVAR'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div ref={bScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {bMsgs.length === 0 && !bLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <LyraAvatar size={48} />
                                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-dim)', letterSpacing: 1, marginTop: 12 }}>
                                        SOBRE O QUE QUER FALAR?
                                    </p>
                                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, maxWidth: 320 }}>
                                        Pode ser uma ideia desestruturada, um desabafo, um problema que precisa de clareza — sem julgamento.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420 }}>
                                    {[
                                        { label: 'Desabafar',            prompt: 'Preciso desabafar sobre algo que está me incomodando.' },
                                        { label: 'Brainstorm de ideias',  prompt: 'Tenho algumas ideias soltas que quero organizar.' },
                                        { label: 'Clarear pensamentos',   prompt: 'Estou com muita coisa na cabeça e preciso de clareza.' },
                                        { label: 'Analisar um problema',  prompt: 'Tenho um problema que preciso de ajuda para resolver.' },
                                        { label: 'Identificar padrões',   prompt: 'Quero entender padrões no meu comportamento recente.' },
                                    ].map(a => (
                                        <button
                                            key={a.label}
                                            onClick={() => handleSendBrainstorm(a.prompt)}
                                            style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid rgba(139,92,246,0.3)`, background: `rgba(139,92,246,0.06)`, color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `rgba(139,92,246,0.15)`; e.currentTarget.style.color = 'var(--text)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = `rgba(139,92,246,0.06)`; e.currentTarget.style.color = 'var(--text-dim)'; }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bMsgs.map(m => (
                            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: m.tipo === 'usuario' ? 'flex-end' : 'flex-start' }}>
                                {m.tipo === 'ia' && <LyraAvatar size={28} />}
                                <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: m.tipo === 'usuario' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: m.tipo === 'usuario' ? `rgba(139,92,246,0.1)` : 'rgba(255,255,255,0.04)', border: m.tipo === 'usuario' ? `1px solid rgba(139,92,246,0.2)` : '1px solid rgba(255,255,255,0.06)', fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
                                    {m.tipo === 'ia' && m.id === typingId ? (
                                        <Typewriter key={m.id} options={{ delay: 10, cursor: '▮' }} onInit={tw => { tw.typeString(cleanIaMsg(m.mensagem)).callFunction(() => setTypingId(null)).start(); }} />
                                    ) : (
                                        <span style={{ whiteSpace: 'pre-wrap' }}>{m.tipo === 'ia' ? cleanIaMsg(m.mensagem) : m.mensagem}</span>
                                    )}
                                </div>
                                {m.tipo === 'usuario' && (
                                    <div style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0, marginTop: 2 }}>
                                        <User size={14} color="var(--text-dim)" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {bLoading && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <LyraAvatar size={28} />
                                <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: LYRA_COLOR, animation: `cd-bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />)}
                                </div>
                            </div>
                        )}

                        {bError && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, color: '#ef4444' }}>{bError}</span>
                            </div>
                        )}
                    </div>

                    {/* Input bar com voz */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={() => toggleVoice('brainstorm')}
                            title={isListening && voiceTarget === 'brainstorm' ? 'Parar gravação' : 'Falar por voz'}
                            style={{ padding: 8, borderRadius: 10, border: 'none', cursor: 'pointer', background: isListening && voiceTarget === 'brainstorm' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: isListening && voiceTarget === 'brainstorm' ? '#ef4444' : 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                        >
                            {isListening && voiceTarget === 'brainstorm' ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <input
                            type="text"
                            value={bInput}
                            onChange={e => setBInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendBrainstorm()}
                            placeholder={isListening && voiceTarget === 'brainstorm' ? '🎙️ Gravando — fale livremente...' : 'Escreva ou fale livremente...'}
                            disabled={bLoading}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={() => handleSendBrainstorm()}
                            disabled={bLoading || !bInput.trim()}
                            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: (bLoading || !bInput.trim()) ? 'rgba(255,255,255,0.05)' : LYRA_COLOR, color: (bLoading || !bInput.trim()) ? 'var(--text-dim)' : 'white', cursor: (bLoading || !bInput.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                        >
                            {bLoading ? <Loader size={16} style={{ animation: 'cd-spin 1s linear infinite' }} /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
