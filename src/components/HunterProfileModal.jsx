import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle } from 'lucide-react';
import { useAppAuth } from '../context/AuthContext';

const CLASSES = [
    { value: "Guerreiro", label: "Guerreiro     — Força e resistência" },
    { value: "Mago", label: "Mago          — Inteligência e estratégia" },
    { value: "Arqueiro", label: "Arqueiro      — Precisão e agilidade" },
    { value: "Curandeiro", label: "Curandeiro    — Equilíbrio e saúde" },
    { value: "Assassino", label: "Assassino     — Velocidade e foco" },
    { value: "Tanque", label: "Tanque        — Disciplina e persistência" },
    { value: "Estudante", label: "Estudante     — Aprendizado constante" },
    { value: "Desenvolvedor", label: "Desenvolvedor — Lógica e criação" },
    { value: "Empreendedor", label: "Empreendedor  — Visão e execução" },
    { value: "Atleta", label: "Atleta        — Performance e evolução" },
    { value: "Criativo", label: "Criativo      — Inovação e expressão" },
];

export function HunterProfileModal({ onClose }) {
    const { login } = useAppAuth();
    const [profile, setProfile] = useState({
        nome: '',
        classe: 'Guerreiro',
        objetivo: '',
        instrucoes: '',
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('orbis_hunter_profile');
            if (raw) setProfile(p => ({ ...p, ...JSON.parse(raw) }));
        } catch { }
    }, []);

    const handleSave = () => {
        if (!profile.nome.trim()) return;
        const updated = { ...profile, nome: profile.nome.trim() };
        localStorage.setItem('orbis_hunter_profile', JSON.stringify(updated));
        login(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }} />

            <div style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth: 540,
                background: "#0b0b1a",
                border: "1px solid var(--border)",
                boxShadow: "0 0 50px rgba(59, 89, 255, 0.12)",
                borderRadius: 16,
                padding: 32,
                maxHeight: "90vh",
                overflowY: "auto",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", boxShadow: "var(--glow-primary)", flexShrink: 0, display: "inline-block" }} />
                            <h2 style={{ fontFamily: "var(--font-system)", fontSize: 15, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                [ PERFIL DO CAÇADOR ]
                            </h2>
                        </div>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#475569", letterSpacing: "0.06em", paddingLeft: 18 }}>
                            O SISTEMA USARÁ ESTES DADOS EM TODAS AS RESPOSTAS
                        </p>
                    </div>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: 6, flexShrink: 0 }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Nome */}
                    <div>
                        <label style={{ fontSize: 10, color: "var(--primary)", display: "block", marginBottom: 6, fontFamily: "var(--font-system)", letterSpacing: "0.1em" }}>
                            IDENTIFICAÇÃO *
                        </label>
                        <input
                            type="text"
                            value={profile.nome}
                            onChange={e => setProfile(p => ({ ...p, nome: e.target.value }))}
                            placeholder="Seu nome"
                        />
                    </div>

                    {/* Classe */}
                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", display: "block", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            CLASSE DO CAÇADOR
                        </label>
                        <select
                            value={profile.classe}
                            onChange={e => setProfile(p => ({ ...p, classe: e.target.value }))}
                        >
                            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    {/* Objetivo */}
                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", display: "block", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            OBJETIVO PRINCIPAL
                        </label>
                        <input
                            type="text"
                            value={profile.objetivo}
                            onChange={e => setProfile(p => ({ ...p, objetivo: e.target.value }))}
                            placeholder="Ex: Melhorar minha produtividade e saúde física"
                        />
                    </div>

                    {/* Instruções */}
                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", display: "block", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            INSTRUÇÕES PARA O SISTEMA
                        </label>
                        <p style={{ fontSize: 11, color: "#475569", marginBottom: 10, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
                            Descreva-se: idade, profissão, contexto, preferências, estilo de resposta. O Sistema memoriza isso e usa em toda interação.
                        </p>
                        <textarea
                            value={profile.instrucoes}
                            onChange={e => setProfile(p => ({ ...p, instrucoes: e.target.value }))}
                            placeholder={`Ex: Tenho 25 anos, sou desenvolvedor de software. Prefiro respostas diretas e técnicas. Acordo cedo e treino de manhã. Foco atual: produtividade, leitura e exercício físico. Não gosto de respostas muito longas.`}
                            rows={6}
                            style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={!profile.nome.trim()}
                            style={{ flex: 2, justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", fontSize: 12, gap: 8 }}
                        >
                            {saved
                                ? <><CheckCircle size={14} /> PERFIL SALVO</>
                                : <><Save size={14} /> SALVAR PERFIL</>
                            }
                        </button>
                    </div>

                    {saved && (
                        <p style={{ fontSize: 11, color: "#22c55e", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                            [ SISTEMA ]: Ficha do Caçador atualizada com sucesso.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
