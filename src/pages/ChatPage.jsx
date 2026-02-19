import React, { useState, useRef, useEffect } from 'react';
import { User, Bot, Mic, Send, AlertCircle, Key, X } from 'lucide-react';
import { useClaudeChat } from '../hooks/useClaudeChat';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Helper para ler do localStorage diretamente
function readKey(name) {
    try {
        const raw = window.localStorage.getItem(name);
        if (!raw) return '';
        return JSON.parse(raw);
    } catch { return ''; }
}

export function ChatPage() {
    const { sendMessage, loading, isSearching, error, clearError, hasKey, provider } = useClaudeChat();

    // Provider: ler direto do localStorage (sem hook compartilhado)
    const [storedProvider, setStoredProviderState] = useState(() => readKey('orbis_ai_provider') || 'gemini');
    const setStoredProvider = (val) => {
        setStoredProviderState(val);
        window.localStorage.setItem('orbis_ai_provider', JSON.stringify(val));
        // Reset model when provider changes
        setStoredModelState('');
        window.localStorage.removeItem('orbis_ai_model');
    };

    // Model: ler direto do localStorage
    const [storedModel, setStoredModelState] = useState(() => readKey('orbis_ai_model') || '');
    const setStoredModel = (val) => {
        setStoredModelState(val);
        window.localStorage.setItem('orbis_ai_model', JSON.stringify(val));
    };

    // Config mode state
    const [configTab, setConfigTab] = useState('ia'); // 'ia' or 'search'

    const MODEL_OPTIONS = {
        gemini: [
            { value: 'gemini-2.5-flash',     label: 'Gemini 2.5 Flash — Recomendado' },
            { value: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro — Mais potente' },
            { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash — Anterior' },
        ],
        zhipu: [
            { value: 'glm-4-plus',            label: 'GLM-4 Plus — Recomendado' },
            { value: 'glm-4-flash',           label: 'GLM-4 Flash — Grátis / Rápido' },
            { value: 'glm-4-long',            label: 'GLM-4 Long — Contexto longo' },
        ],
        siliconflow: [
            { value: 'deepseek-ai/DeepSeek-V3',              label: 'DeepSeek V3 — Recomendado' },
            { value: 'deepseek-ai/DeepSeek-R1',              label: 'DeepSeek R1 — Raciocínio' },
            { value: 'Qwen/Qwen2.5-72B-Instruct',            label: 'Qwen 2.5 72B' },
        ],
    };

    // UI state
    const [messages, setMessages] = useLocalStorage('orbis_chat_history', [
        { id: "w", tipo: "ia", mensagem: "Olá! Sou The System, seu assistente pessoal. Como posso ajudar você hoje? ⚡\n\nVocê pode me pedir para:\n• Criar tarefas, hábitos, lembretes\n• Registrar despesas e receitas\n• Consultar sua agenda\n• E muito mais!", timestamp: new Date().toISOString() }
    ]);
    const [input, setInput] = useState("");
    const [tempKey, setTempKey] = useState("");
    const [showKeyInput, setShowKeyInput] = useState(!hasKey);
    const scrollRef = useRef(null);

    // Auto-dismiss de erros após 6 segundos
    useEffect(() => {
        if (error) {
            const t = setTimeout(() => clearError(), 6000);
            return () => clearTimeout(t);
        }
    }, [error]);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msgText = input.trim();
        const newUserMsg = { id: Date.now().toString(), tipo: "usuario", mensagem: msgText, timestamp: new Date().toISOString() };

        const newMessages = [...messages, newUserMsg];
        setMessages(newMessages);
        setInput("");

        const aiResponseText = await sendMessage(newMessages);

        if (aiResponseText) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                tipo: "ia",
                mensagem: aiResponseText,
                timestamp: new Date().toISOString()
            }]);
        }
    };

    const handleSaveKey = () => {
        const key = tempKey.trim();
        if (key.length > 5) {
            try {
                if (configTab === 'ia') {
                    // IMPORTANTE: salvar TANTO a chave quanto o provider selecionado
                    const storageKey = storedProvider === 'gemini'
                        ? 'orbis_gemini_key'
                        : storedProvider === 'zhipu'
                            ? 'orbis_zhipu_key'
                            : 'orbis_siliconflow_key';
                    window.localStorage.setItem(storageKey, JSON.stringify(key));
                    // Garantir que o provider também está gravado no localStorage
                    window.localStorage.setItem('orbis_ai_provider', JSON.stringify(storedProvider));
                    console.log(`[Orbis] Salvo: ${storageKey} + provider=${storedProvider}`);
                } else {
                    window.localStorage.setItem('orbis_brave_key', JSON.stringify(key));
                    console.log("[Orbis] Chave Brave salva.");
                }
            } catch (e) {
                alert("Erro ao salvar: " + e.message);
                return;
            }

            setTempKey("");
            // Recarregar para que tudo leia os valores atualizados
            window.location.reload();
        } else {
            alert("Por favor, insira uma chave válida (mínimo 6 caracteres).");
        }
    };



    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#06b6d4", textShadow: "0 0 16px rgba(6,182,212,0.4)" }}>[ CHAT ]</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>INTERFACE DE COMUNICAÇÃO</p>
                </div>
                <button className="btn-ghost" onClick={() => setShowKeyInput(!showKeyInput)}>
                    <Key size={18} color={hasKey ? "var(--primary)" : "var(--text-muted)"} />
                </button>
            </div>

            {showKeyInput && (
                <div className="card animate-slide-up" style={{ padding: 20, border: "1px solid rgba(6,182,212,0.35)", background: "rgba(6,182,212,0.04)" }}>
                    <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", marginBottom: 16, paddingBottom: 8 }}>
                        <button
                            onClick={() => setConfigTab('ia')}
                            style={{ background: "none", border: "none", color: configTab === 'ia' ? "var(--primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", borderBottom: configTab === 'ia' ? "2px solid var(--primary)" : "none" }}
                        >
                            Cérebro (IA)
                        </button>
                        <button
                            onClick={() => setConfigTab('search')}
                            style={{ background: "none", border: "none", color: configTab === 'search' ? "var(--primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", borderBottom: configTab === 'search' ? "2px solid var(--primary)" : "none" }}
                        >
                            Busca Web (Brave)
                        </button>
                    </div>

                    {configTab === 'ia' ? (
                        <>
                            <h4 style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Configuração da Inteligência</h4>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Provedor de IA</label>
                                <select
                                    value={storedProvider}
                                    onChange={(e) => setStoredProvider(e.target.value)}
                                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", color: "var(--text)", outline: "none" }}
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="zhipu">Zhipu AI / GLM (Z.ai)</option>
                                    <option value="siliconflow">SiliconFlow</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Modelo</label>
                                <select
                                    value={storedModel}
                                    onChange={(e) => setStoredModel(e.target.value)}
                                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", color: "var(--text)", outline: "none" }}
                                >
                                    {MODEL_OPTIONS[storedProvider]?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                                {storedProvider === 'gemini'
                                    ? "Insira sua chave do Google AI Studio."
                                    : storedProvider === 'zhipu'
                                        ? "Insira sua API Key do BigModel (z.ai)."
                                        : "Insira sua API Key da SiliconFlow."}
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Configuração de Busca na Web</h4>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                                Insira sua chave da <strong>Brave Search API</strong> para permitir que The System pesquise informações reais na internet.
                            </p>
                        </>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                        <input
                            type="password"
                            value={tempKey}
                            onChange={e => setTempKey(e.target.value)}
                            placeholder={configTab === 'ia' ? "Chave da IA..." : "Chave da Brave Search..."}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={handleSaveKey}>Salvar</button>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button onClick={clearError} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2, display: "flex" }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(17,24,39,0.4)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasKey ? "#22c55e" : "#f59e0b" }} className={hasKey ? "pulse-ring" : ""} />
                        <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#06b6d4" }}>
                            THE SYSTEM {provider === 'gemini' ? '// Gemini 2.0' : (provider === 'zhipu' ? '// GLM-4' : '// DeepSeek V3')}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>• {hasKey ? "online" : "requer chave"}</span>
                        {readKey('orbis_brave_key') && (
                            <span style={{ fontSize: 10, background: "rgba(59,130,246,0.1)", color: "var(--primary)", padding: "2px 6px", borderRadius: 4, fontWeight: 600, marginLeft: 8 }}>
                                + BUSCA WEB
                            </span>
                        )}
                    </div>

                    {/* Painel de Diagnóstico de Chaves */}
                    <div style={{ display: "flex", gap: 6 }}>
                        {['gemini', 'zhipu', 'siliconflow', 'brave'].map(k => {
                            const isPresent = !!readKey(`orbis_${k === 'brave' ? 'brave' : k}_key`);
                            const label = k[0].toUpperCase();
                            return (
                                <div
                                    key={k}
                                    title={`${k}: ${isPresent ? 'Detectada' : 'Ausente'}`}
                                    style={{
                                        width: 18, height: 18, borderRadius: 4,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 9, fontWeight: 800,
                                        background: isPresent ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                                        color: isPresent ? "#22c55e" : "var(--text-muted)",
                                        border: `1px solid ${isPresent ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: msg.tipo === "usuario" ? "row-reverse" : "row" }} className="animate-slide-up">
                            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.tipo === "usuario" ? "rgba(6,182,212,0.15)" : "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
                                {msg.tipo === "usuario" ? <User size={14} color="var(--primary)" /> : <Bot size={14} color="white" />}
                            </div>
                            <div className={msg.tipo === "usuario" ? "chat-bubble-user" : "chat-bubble-ai"} style={{ maxWidth: "75%", padding: "12px 16px" }}>
                                <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg.mensagem}</p>
                                <span style={{ fontSize: 11, opacity: 0.5, marginTop: 4, display: "block" }}>
                                    {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: `float 1s ease-in-out ${i * 0.15}s infinite` }} />
                                ))}
                            </div>
                            {isSearching && (
                                <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500, animation: "pulse 2s infinite" }}>
                                    Pesquisando na internet...
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "rgba(17,24,39,0.4)", display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSend()}
                            placeholder={hasKey ? "Converse com The System..." : "Adicione uma chave API primeiro..."}
                            disabled={loading || !hasKey}
                            style={{ paddingRight: 44 }}
                        />
                        <button className="btn-ghost" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }} disabled={!hasKey}>
                            <Mic size={16} />
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || loading || !hasKey} style={{ padding: "12px 16px" }}>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
