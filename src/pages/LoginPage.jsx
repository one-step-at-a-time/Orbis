import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Mail, Lock, AlertCircle, ChevronLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signUp, resetPassword } from '../services/supabaseService';
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

    // Estado do fluxo "esqueci minha senha"
    const [forgotMode, setForgotMode]   = useState(false);
    const [resetEmail, setResetEmail]   = useState('');
    const [resetSent, setResetSent]     = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError]   = useState('');

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
            } else {
                const { error: err } = await signUp(email.trim(), password);
                if (err) {
                    setError(translateError(err.message));
                } else {
                    setSuccessMsg('Conta criada! Entre com seus dados agora.');
                    setTab('acessar');
                }
            }
        } catch (err) {
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setResetError('');
        if (!resetEmail.trim()) { setResetError('Informe seu e-mail.'); return; }
        setResetLoading(true);
        try {
            const { error: err } = await resetPassword(resetEmail.trim());
            if (err) setResetError(translateError(err.message));
            else setResetSent(true);
        } catch (err) {
            setResetError(translateError(err.message));
        } finally {
            setResetLoading(false);
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

    const inputWrapStyle = { position: 'relative', display: 'flex', alignItems: 'center' };
    const iconStyle = { position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', overflow: 'hidden', background: '#000' }}>
            <div className="tactical-grid-bg" />
            <div className="tactical-particles" />
            <BackgroundBeams className="z-0 opacity-40" />
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.06), transparent 70%)', top: '-15%', right: '-10%', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,184,200,0.04), transparent 70%)', bottom: '-10%', left: '-8%', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="card"
                style={{ width: '100%', maxWidth: 440, padding: '40px 36px', position: 'relative', zIndex: 1, background: 'rgba(5,5,5,0.85)', border: '1px solid rgba(0,240,255,0.25)', boxShadow: '0 0 60px rgba(0,240,255,0.06)', backdropFilter: 'blur(20px)' }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.6 }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="glow-cyan animate-float" style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Zap size={30} color="black" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-system)', fontSize: 24, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--primary)', textShadow: '0 0 20px rgba(0,240,255,0.6)', margin: 0 }}>
                        THE SYSTEM
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6, fontFamily: 'var(--font-interface)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {forgotMode ? '▸ RECUPERAÇÃO DE ACESSO' : tab === 'acessar' ? '▸ AUTENTICAÇÃO REQUERIDA' : '▸ NOVO AGENTE — REGISTRO'}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── MODO ESQUECI MINHA SENHA ── */}
                    {forgotMode ? (
                        <motion.div key="forgot" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                            {resetSent ? (
                                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                                    <p style={{ color: 'var(--success)', fontFamily: 'var(--font-interface)', fontSize: 12, letterSpacing: '0.06em', marginBottom: 6 }}>
                                        ✓ Link enviado com sucesso!
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', fontSize: 10, letterSpacing: '0.04em', marginBottom: 24 }}>
                                        Verifique sua caixa de entrada em <span style={{ color: 'var(--text-secondary)' }}>{resetEmail}</span>
                                    </p>
                                    <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11, letterSpacing: '0.1em' }}>
                                        ← VOLTAR PARA O LOGIN
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div>
                                        <label style={labelStyle}>E-MAIL DA CONTA</label>
                                        <div style={inputWrapStyle}>
                                            <Mail size={14} style={iconStyle} />
                                            <input autoFocus type="email" value={resetEmail} onChange={e => { setResetEmail(e.target.value); setResetError(''); }} placeholder="agente@sistema.io" style={{ paddingLeft: 36 }} autoComplete="email" />
                                        </div>
                                    </div>

                                    {resetError && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,42,74,0.08)', border: '1px solid rgba(255,42,74,0.2)', borderRadius: 4 }}>
                                            <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
                                            <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-interface)', margin: 0 }}>{resetError}</p>
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-primary" disabled={resetLoading} style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 12, fontFamily: 'var(--font-interface)', letterSpacing: '0.12em', opacity: resetLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Send size={13} />
                                        {resetLoading ? 'ENVIANDO...' : 'ENVIAR LINK DE RECUPERAÇÃO'}
                                    </button>

                                    <button type="button" onClick={() => { setForgotMode(false); setResetError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', fontSize: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', padding: '4px 0' }}>
                                        <ChevronLeft size={12} /> VOLTAR
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    ) : (
                        /* ── MODO LOGIN / REGISTRAR ── */
                        <motion.div key="login" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                            {/* Tabs */}
                            <div style={{ display: 'flex', marginBottom: 28, border: '1px solid rgba(0,240,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                                {['acessar', 'registrar'].map(t => (
                                    <button key={t} type="button" onClick={() => { setTab(t); reset(); }} style={{ flex: 1, padding: '10px 0', fontSize: 10, fontFamily: 'var(--font-interface)', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: tab === t ? 'rgba(0,240,255,0.12)' : 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: tab === t ? 600 : 400 }}>
                                        {t === 'acessar' ? 'ACESSAR' : 'REGISTRAR'}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <div>
                                    <label style={labelStyle}>E-MAIL</label>
                                    <div style={inputWrapStyle}>
                                        <Mail size={14} style={iconStyle} />
                                        <input autoFocus type="email" value={email} onChange={e => { setEmail(e.target.value); reset(); }} placeholder="agente@sistema.io" style={{ paddingLeft: 36 }} autoComplete="email" />
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label style={{ ...labelStyle, marginBottom: 0 }}>SENHA</label>
                                        {tab === 'acessar' && (
                                            <button type="button" onClick={() => { setForgotMode(true); setResetEmail(email); reset(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', fontSize: 9, letterSpacing: '0.06em', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                                                Esqueci minha senha
                                            </button>
                                        )}
                                    </div>
                                    <div style={inputWrapStyle}>
                                        <Lock size={14} style={iconStyle} />
                                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); reset(); }} placeholder={tab === 'registrar' ? 'mínimo 6 caracteres' : '••••••••'} style={{ paddingLeft: 36, paddingRight: 44 }} autoComplete={tab === 'acessar' ? 'current-password' : 'new-password'} />
                                        <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,42,74,0.08)', border: '1px solid rgba(255,42,74,0.2)', borderRadius: 4 }}>
                                        <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
                                        <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-interface)', margin: 0, letterSpacing: '0.06em' }}>{error}</p>
                                    </div>
                                )}

                                {successMsg && (
                                    <p style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-interface)', letterSpacing: '0.06em' }}>✓ {successMsg}</p>
                                )}

                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 12, marginTop: 4, fontFamily: 'var(--font-interface)', letterSpacing: '0.12em', opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'PROCESSANDO...' : tab === 'acessar' ? 'ACESSAR O SISTEMA' : 'CRIAR CONTA'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', marginTop: 24, fontFamily: 'var(--font-interface)', letterSpacing: '0.06em' }}>
                    AUTENTICAÇÃO VIA SUPABASE — DADOS SEGUROS NA NUVEM
                </p>
            </motion.div>

            <ScanlineOverlay />
        </div>
    );
}
