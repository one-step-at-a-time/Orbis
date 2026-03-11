import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { signIn, signUp } from '../services/supabaseService';
import { BackgroundBeams, ScanlineOverlay } from '../components/AceternityUI';

// Traduz mensagens de erro do Supabase para PT-BR
function translateError(msg = '') {
    if (msg.includes('Invalid login credentials'))       return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed'))             return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('User already registered'))         return 'Este e-mail já está cadastrado.';
    if (msg.includes('Password should be at least'))     return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('Unable to validate email'))        return 'Endereço de e-mail inválido.';
    if (msg.includes('rate limit') || msg.includes('too many'))
                                                         return 'Muitas tentativas. Aguarde um momento.';
    if (msg.includes('não configurado'))                 return msg;
    return 'Erro: ' + msg;
}

export function LoginPage() {
    const [tab, setTab]               = useState('acessar'); // 'acessar' | 'registrar'
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [showPass, setShowPass]     = useState(false);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const reset = () => { setError(''); setSuccessMsg(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        reset();

        if (!email.trim() || !password.trim()) {
            setError('Preencha e-mail e senha.');
            return;
        }

        setLoading(true);
        try {
            if (tab === 'acessar') {
                const { error: err } = await signIn(email.trim(), password);
                if (err) setError(translateError(err.message));
                // Se sucesso → onAuthChange no AuthContext atualiza a sessão automaticamente
            } else {
                const { error: err } = await signUp(email.trim(), password);
                if (err) {
                    setError(translateError(err.message));
                } else {
                    setSuccessMsg('Conta criada! Verifique seu e-mail ou entre agora.');
                    setTab('acessar');
                }
            }
        } catch (err) {
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = {
        fontSize: 10,
        color: 'var(--primary)',
        marginBottom: 6,
        display: 'block',
        fontFamily: 'var(--font-interface)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
    };

    const inputWrapStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    };

    const iconStyle = {
        position: 'absolute',
        left: 12,
        color: 'var(--text-muted)',
        pointerEvents: 'none',
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            position: 'relative',
            overflow: 'hidden',
            background: '#000',
        }}>
            {/* Fundo tático */}
            <div className="tactical-grid-bg" />
            <div className="tactical-particles" />
            <BackgroundBeams className="z-0 opacity-40" />

            {/* Glow blobs de fundo */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.06), transparent 70%)', top: '-15%', right: '-10%', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,184,200,0.04), transparent 70%)', bottom: '-10%', left: '-8%', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="card"
                style={{
                    width: '100%',
                    maxWidth: 440,
                    padding: '40px 36px',
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(5,5,5,0.85)',
                    border: '1px solid rgba(0,240,255,0.25)',
                    boxShadow: '0 0 60px rgba(0,240,255,0.06), 0 0 120px rgba(0,240,255,0.03)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Scanner line no topo do card */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.6 }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        className="glow-cyan animate-float"
                        style={{
                            width: 64, height: 64, borderRadius: 18,
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}
                    >
                        <Zap size={30} color="black" strokeWidth={2.5} />
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 24, fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--primary)',
                        textShadow: '0 0 20px rgba(0,240,255,0.6)',
                        margin: 0,
                    }}>
                        THE SYSTEM
                    </h1>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: 10,
                        marginTop: 6,
                        fontFamily: 'var(--font-interface)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        {tab === 'acessar' ? '▸ AUTENTICAÇÃO REQUERIDA' : '▸ NOVO AGENTE — REGISTRO'}
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    marginBottom: 28,
                    border: '1px solid rgba(0,240,255,0.15)',
                    borderRadius: 4,
                    overflow: 'hidden',
                }}>
                    {['acessar', 'registrar'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => { setTab(t); reset(); }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                fontSize: 10,
                                fontFamily: 'var(--font-interface)',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: tab === t ? 'rgba(0,240,255,0.12)' : 'transparent',
                                color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                                fontWeight: tab === t ? 600 : 400,
                            }}
                        >
                            {t === 'acessar' ? 'ACESSAR' : 'REGISTRAR'}
                        </button>
                    ))}
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* E-mail */}
                    <div>
                        <label style={labelStyle}>E-MAIL</label>
                        <div style={inputWrapStyle}>
                            <Mail size={14} style={iconStyle} />
                            <input
                                autoFocus
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); reset(); }}
                                placeholder="agente@sistema.io"
                                style={{ paddingLeft: 36 }}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div>
                        <label style={labelStyle}>SENHA</label>
                        <div style={inputWrapStyle}>
                            <Lock size={14} style={iconStyle} />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); reset(); }}
                                placeholder={tab === 'registrar' ? 'mínimo 6 caracteres' : '••••••••'}
                                style={{ paddingLeft: 36, paddingRight: 44 }}
                                autoComplete={tab === 'acessar' ? 'current-password' : 'new-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                style={{
                                    position: 'absolute', right: 12,
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', padding: 0,
                                    color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center',
                                }}
                                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,42,74,0.08)', border: '1px solid rgba(255,42,74,0.2)', borderRadius: 4 }}>
                            <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-interface)', margin: 0, letterSpacing: '0.06em' }}>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Sucesso */}
                    {successMsg && (
                        <p style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-interface)', letterSpacing: '0.06em' }}>
                            ✓ {successMsg}
                        </p>
                    )}

                    {/* Botão */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '13px 20px',
                            fontSize: 12,
                            marginTop: 4,
                            fontFamily: 'var(--font-interface)',
                            letterSpacing: '0.12em',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading
                            ? 'PROCESSANDO...'
                            : tab === 'acessar' ? 'ACESSAR O SISTEMA' : 'CRIAR CONTA'}
                    </button>
                </form>

                {/* Rodapé */}
                <p style={{
                    textAlign: 'center',
                    fontSize: 9,
                    color: 'var(--text-dim)',
                    marginTop: 24,
                    fontFamily: 'var(--font-interface)',
                    letterSpacing: '0.06em',
                }}>
                    AUTENTICAÇÃO VIA SUPABASE — DADOS SEGUROS NA NUVEM
                </p>
            </motion.div>

            <ScanlineOverlay />
        </div>
    );
}
