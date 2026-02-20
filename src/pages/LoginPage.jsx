import React, { useState } from 'react';
import { Zap } from 'lucide-react';

const CLASSES = [
    { value: "Guerreiro",       label: "Guerreiro       — Força e resistência" },
    { value: "Mago",            label: "Mago            — Inteligência e estratégia" },
    { value: "Arqueiro",        label: "Arqueiro        — Precisão e agilidade" },
    { value: "Curandeiro",      label: "Curandeiro      — Equilíbrio e saúde" },
    { value: "Assassino",       label: "Assassino       — Velocidade e foco" },
    { value: "Tanque",          label: "Tanque          — Disciplina e persistência" },
    { value: "Estudante",       label: "Estudante       — Aprendizado constante" },
    { value: "Desenvolvedor",   label: "Desenvolvedor   — Lógica e criação" },
    { value: "Empreendedor",    label: "Empreendedor    — Visão e execução" },
    { value: "Atleta",          label: "Atleta          — Performance e evolução" },
    { value: "Criativo",        label: "Criativo        — Inovação e expressão" },
];

export function LoginPage({ onLogin }) {
    const [nome, setNome] = useState("");
    const [classe, setClasse] = useState("Guerreiro");
    const [objetivo, setObjetivo] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nome.trim()) {
            setError("O Sistema exige uma identificação, Caçador.");
            return;
        }
        const profile = { nome: nome.trim(), classe, objetivo: objetivo.trim() };
        localStorage.setItem('orbis_hunter_profile', JSON.stringify(profile));
        onLogin(profile);
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden", background: "#050810" }}>
            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)", top: "-10%", right: "-5%", filter: "blur(60px)" }} />
            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)", bottom: "-5%", left: "-5%", filter: "blur(60px)" }} />

            <div className="card animate-slide-up" style={{ width: "100%", maxWidth: 440, padding: 40, position: "relative", zIndex: 1, background: "#090d1a", border: "1px solid rgba(6,182,212,0.25)", boxShadow: "0 0 40px rgba(6,182,212,0.1)" }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div className="glow-cyan animate-float" style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Zap size={32} color="white" />
                    </div>
                    <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#06b6d4", textShadow: "0 0 20px rgba(6,182,212,0.5)" }}>
                        THE SYSTEM
                    </h1>
                    <p style={{ color: "#475569", fontSize: 11, marginTop: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
                        NOVO CAÇADOR DETECTADO — REGISTRO OBRIGATÓRIO
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", marginBottom: 6, display: "block", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            IDENTIFICAÇÃO DO CAÇADOR *
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={nome}
                            onChange={(e) => { setNome(e.target.value); setError(""); }}
                            placeholder="Seu nome"
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", marginBottom: 6, display: "block", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            CLASSE
                        </label>
                        <select value={classe} onChange={e => setClasse(e.target.value)}>
                            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: "#06b6d4", marginBottom: 6, display: "block", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                            OBJETIVO PRINCIPAL
                        </label>
                        <input
                            type="text"
                            value={objetivo}
                            onChange={e => setObjetivo(e.target.value)}
                            placeholder="O que você quer conquistar?"
                        />
                    </div>

                    {error && (
                        <p style={{ fontSize: 11, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                            [ ERRO ]: {error}
                        </p>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 13, marginTop: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                        INICIAR JORNADA
                    </button>
                </form>

                <p style={{ textAlign: "center", fontSize: 10, color: "#2d3748", marginTop: 20, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
                    Dados armazenados localmente neste dispositivo.
                </p>
            </div>
        </div>
    );
}
