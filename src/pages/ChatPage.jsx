import React, { useState, useRef, useEffect } from 'react';
import Typewriter from 'typewriter-effect';
import { User, Bot, Mic, MicOff, Send, AlertCircle, Key, X, Trash2, Volume2, VolumeX } from 'lucide-react';
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
    const [configTab, setConfigTab] = useState('ia'); // 'ia', 'search' or 'voz'

    const MODEL_OPTIONS = {
        gemini: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — Recomendado' },
            { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — Mais potente' },
            { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Anterior' },
        ],
        zhipu: [
            { value: 'glm-4-plus', label: 'GLM-4 Plus — Recomendado' },
            { value: 'glm-4-flash', label: 'GLM-4 Flash — Grátis / Rápido' },
            { value: 'glm-4-long', label: 'GLM-4 Long — Contexto longo' },
        ],
        siliconflow: [
            { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3 — Recomendado' },
            { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 — Raciocínio' },
            { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B' },
        ],
    };

    // UI state
    const [messages, setMessages] = useLocalStorage('orbis_chat_history', [
        { id: "w", tipo: "ia", mensagem: "[ SISTEMA ]: Conexão estabelecida, Caçador.\n\nNúcleo operacional ativo. Todos os subsistemas funcionando.\n\nCapacidades disponíveis:\n- Registrar missões, tarefas e projetos\n- Criar hábitos e lembretes\n- Gerenciar recursos financeiros\n- Consultar dados externos em tempo real\n\nAguardando instrução.", timestamp: new Date().toISOString() }
    ]);
    const [input, setInput] = useState("");
    const [tempKey, setTempKey] = useState("");
    const [showKeyInput, setShowKeyInput] = useState(!hasKey);
    const [typingMsgId, setTypingMsgId] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const scrollRef = useRef(null);
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);

    // Limpa recursos de áudio ao desmontar
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
            audioRef.current?.pause();
        };
    }, []);

    const applyPunctuation = (text, isFinal = false) => {
        let t = text.trim();
        if (!t) return t;
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (isFinal && !/[.!?,;:]$/.test(t)) t += '.';
        return t;
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = true;

        let finalTranscript = '';

        recognition.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript + ' ';
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            const combined = (finalTranscript + interim).trim();
            setInput(applyPunctuation(combined, !interim));
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e) => { if (e.error !== 'aborted') setIsListening(false); };
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const cleanForSpeech = (text) => text
        .replace(/\[ SISTEMA \]:/g, '')
        .replace(/\[ ALERTA \]:/g, '')
        .replace(/<br\s*\/?>/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const speak = async (text) => {
        if (!isTtsEnabled) return;
        const clean = cleanForSpeech(text);
        if (!clean) return;

        const elKey = readKey('orbis_elevenlabs_key');

        if (elKey) {
            try {
                audioRef.current?.pause();
                const voiceId = 'onwK4e9ZLuTAKqWW03F9'; // Daniel — frio, preciso, sistema
                const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: 'POST',
                    headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: clean,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: { stability: 0.85, similarity_boost: 0.45, style: 0, use_speaker_boost: false },
                    }),
                });
                if (!res.ok) throw new Error('ElevenLabs error');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.play();
                audio.onended = () => URL.revokeObjectURL(url);
                return;
            } catch (e) {
                console.error('[TTS] ElevenLabs falhou, usando fallback:', e);
            }
        }

        // Fallback: Web Speech API
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.92;
        utterance.pitch = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) utterance.voice = ptVoice;
        window.speechSynthesis.speak(utterance);
    };

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

        // Limitar histórico a 100 mensagens para evitar overflow do localStorage
        const MAX_HISTORY = 100;
        const newMessages = [...messages, newUserMsg].slice(-MAX_HISTORY);
        setMessages(newMessages);
        setInput("");

        const aiResponseText = await sendMessage(newMessages);

        if (aiResponseText) {
            const newId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: newId,
                tipo: "ia",
                mensagem: aiResponseText,
                timestamp: new Date().toISOString()
            }].slice(-MAX_HISTORY));
            setTypingMsgId(newId);
            speak(aiResponseText);
        }
    };

    const handleSaveKey = (specificKey, category) => {
        const key = specificKey || tempKey.trim();
        if (key.length > 5) {
            try {
                if (category === 'ia') {
                    const storageKey = storedProvider === 'gemini'
                        ? 'orbis_gemini_key'
                        : storedProvider === 'zhipu'
                            ? 'orbis_zhipu_key'
                            : 'orbis_siliconflow_key';
                    window.localStorage.setItem(storageKey, JSON.stringify(key));
                    window.localStorage.setItem('orbis_ai_provider', JSON.stringify(storedProvider));
                } else if (category === 'search') {
                    window.localStorage.setItem('orbis_brave_key', JSON.stringify(key));
                } else if (category === 'voz') {
                    window.localStorage.setItem('orbis_elevenlabs_key', JSON.stringify(key));
                }
            } catch (e) {
                alert("Erro ao salvar: " + e.message);
                return;
            }
            setTempKey("");
            window.location.reload();
        }
    };



    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24, height: "100%", position: "relative", maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                    <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: "0.05em", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--primary)" }}>#</span> Project-Nebula
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</div>
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>Secure High-Tech Collaboration Channel • 12 Active Nodes</p>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        className="btn-ghost"
                        onClick={() => { if (window.confirm('Limpar histórico do chat?')) { setMessages([{ id: "w", tipo: "ia", mensagem: "[ SISTEMA ]: Conexão estabelecida, Caçador.\n\nNúcleo operacional ativo. Todos os subsistemas funcionando.\n\nAguardando instrução.", timestamp: new Date().toISOString() }]); } }}
                        title="Limpar conversa"
                        style={{ padding: 8, color: "var(--text-muted)" }}
                    >
                        <Trash2 size={16} />
                    </button>
                    <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "4px 12px", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>ENCRYPTION ESTABLISHED</span>
                    </div>
                </div>
            </div>

            {showKeyInput && (
                <div className="card animate-hud-boot" style={{
                    padding: 24,
                    border: "1px solid var(--border-mid)",
                    background: "rgba(11, 11, 26, 0.95)",
                    marginBottom: 20,
                    backdropFilter: "blur(12px)",
                    boxShadow: "var(--glow-primary)",
                    borderRadius: 16
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 16 }}>
                            {['ia', 'search', 'voz'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setConfigTab(tab)}
                                    style={{
                                        background: configTab === tab ? "rgba(59, 89, 255, 0.1)" : "none",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        color: configTab === tab ? "var(--primary)" : "var(--text-dim)",
                                        fontWeight: 700,
                                        fontSize: 12,
                                        cursor: "pointer",
                                        letterSpacing: "0.1em",
                                        transition: "all 0.2s",
                                        borderBottom: configTab === tab ? "2px solid var(--primary)" : "none"
                                    }}
                                >
                                    {tab.toUpperCase()} CORE
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowKeyInput(false)} className="btn-ghost" style={{ opacity: 0.5 }}><X size={16} /></button>
                    </div>

                    <div className="animate-fade-in" key={configTab}>
                        {configTab === 'ia' && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>PROVIDER</label>
                                        <select
                                            value={storedProvider}
                                            onChange={(e) => setStoredProvider(e.target.value)}
                                            style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-low)", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }}
                                        >
                                            <option value="gemini">Google Gemini</option>
                                            <option value="siliconflow">SiliconFlow (DeepSeek)</option>
                                            <option value="zhipu">Zhipu AI (GLM)</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>MODEL</label>
                                        <select
                                            value={storedModel}
                                            onChange={(e) => setStoredModel(e.target.value)}
                                            style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-low)", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }}
                                        >
                                            <option value="">Default (Auto)</option>
                                            {MODEL_OPTIONS[storedProvider]?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <input
                                        type="password"
                                        value={tempKey}
                                        onChange={e => setTempKey(e.target.value)}
                                        placeholder={`Enter ${storedProvider.toUpperCase()} Neural Key...`}
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={() => handleSaveKey(null, 'ia')}>SYNC</button>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: hasKey ? "var(--success)" : "var(--danger)" }} />
                                    {hasKey ? `Connected to ${storedProvider.toUpperCase()}` : "No Neural Key Detected"}
                                </div>
                            </div>
                        )}

                        {configTab === 'search' && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <input
                                        type="password"
                                        value={tempKey}
                                        onChange={e => setTempKey(e.target.value)}
                                        placeholder="Enter Brave Search Key..."
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={() => handleSaveKey(null, 'search')}>SYNC</button>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                                    Allows THE SYSTEM to access real-time web data via Brave Search API.
                                </div>
                            </div>
                        )}

                        {configTab === 'voz' && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <input
                                        type="password"
                                        value={tempKey}
                                        onChange={e => setTempKey(e.target.value)}
                                        placeholder="Enter ElevenLabs Voice Key..."
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={() => handleSaveKey(null, 'voz')}>SYNC</button>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                                    Enables high-fidelity neural voice synthesis.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 20 }}>
                    <AlertCircle size={16} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button onClick={clearError} className="btn-ghost" style={{ padding: 2 }}><X size={14} /></button>
                </div>
            )}

            <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "transparent", border: "none", boxShadow: "none" }}>
                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "10px 0", display: "flex", flexDirection: "column", gap: 24 }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{ display: "flex", gap: 16, flexDirection: msg.tipo === "usuario" ? "row-reverse" : "row" }} className="animate-slide-up">
                            <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.tipo === "usuario" ? "rgba(59, 89, 255, 0.1)" : "var(--primary)", border: msg.tipo === "usuario" ? "2.5px solid var(--primary)" : "none" }}>
                                {msg.tipo === "usuario" ? <User size={20} color="var(--primary)" /> : <Bot size={20} color="white" />}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: msg.tipo === "usuario" ? "flex-end" : "flex-start" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{msg.tipo === "usuario" ? "Commander_Z" : "Neural_AI"}</span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                                </div>
                                <div className={msg.tipo === "usuario" ? "chat-bubble-user" : "chat-bubble-ai"} style={{ padding: "18px 24px", fontSize: 16, maxWidth: 640 }}>
                                    {msg.tipo === "ia" && msg.id === typingMsgId ? (
                                        <div style={{ lineHeight: 1.6 }}>
                                            <Typewriter
                                                options={{ delay: 14, cursor: '▌', loop: false }}
                                                onInit={(tw) => {
                                                    tw.typeString(msg.mensagem.replace(/\n/g, '<br />'))
                                                        .callFunction(() => setTypingMsgId(null))
                                                        .start();
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.mensagem}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
                            <div style={{ display: "flex", gap: 5 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", animation: `float 1s ease-in-out ${i * 0.15}s infinite` }} />
                                ))}
                            </div>
                            {isSearching && <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>SYNCING WITH EXTERNAL ARCHIVES...</span>}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 20, background: "var(--purple)", borderRadius: 16, padding: "8px 16px", display: "flex", gap: 12, alignItems: "center", border: showKeyInput ? "1px solid var(--primary)" : "1px solid transparent", transition: "all 0.3s" }}>
                    <button
                        className="btn-ghost"
                        style={{ padding: 8, color: showKeyInput ? "var(--primary)" : "rgba(255,255,255,0.7)" }}
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        title="System Control Panel"
                    >
                        <Bot size={22} className={showKeyInput ? "animate-pulse" : ""} />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        placeholder="Transmit neural message..."
                        disabled={loading || !hasKey}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            fontSize: 16,
                            padding: "12px 0",
                            flex: 1,
                            outline: "none"
                        }}
                    />
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <button
                            className="btn-ghost"
                            style={{ padding: 6, color: isTtsEnabled ? "var(--primary)" : "rgba(255,255,255,0.6)" }}
                            onClick={() => { setIsTtsEnabled(v => !v); window.speechSynthesis?.cancel(); }}
                        >
                            <Volume2 size={20} />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading || !hasKey}
                            style={{ background: "var(--primary)", border: "none", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
