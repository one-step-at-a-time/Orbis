import React, { useState } from 'react';
import { Zap } from 'lucide-react';

export function LoginPage({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [nome, setNome] = useState("");
    const [senha, setSenha] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin({ nome: nome || "Anderson", email: email || "anderson@email.com" });
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden", background: "#050810" }}>
            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)", top: "-10%", right: "-5%", filter: "blur(60px)" }} />
            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)", bottom: "-5%", left: "-5%", filter: "blur(60px)" }} />

            <div className="card animate-slide-up" style={{ width: "100%", maxWidth: 420, padding: 40, position: "relative", zIndex: 1, background: "#090d1a", border: "1px solid rgba(6,182,212,0.25)", boxShadow: "0 0 40px rgba(6,182,212,0.1)" }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div className="glow-cyan animate-float" style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Zap size={32} color="white" />
                    </div>
                    <h1 style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 26,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#06b6d4",
                        textShadow: "0 0 20px rgba(6,182,212,0.5)",
                    }}>THE SYSTEM</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>Seu sistema de crescimento pessoal</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {!isLogin && (
                        <div>
                            <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Nome</label>
                            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Senha</label>
                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 15, marginTop: 8 }}>
                        {isLogin ? "Entrar" : "Criar conta"}
                    </button>
                </form>

                <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 20 }}>
                    {isLogin ? "Não tem conta? " : "Já tem conta? "}
                    <button onClick={() => setIsLogin(!isLogin)} style={{ color: "#06b6d4", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                        {isLogin ? "Criar uma" : "Entrar"}
                    </button>
                </p>
            </div>
        </div>
    );
}
