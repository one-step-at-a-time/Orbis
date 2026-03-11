import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { updatePassword } from '../services/supabaseService';
import { BackgroundBeams, ScanlineOverlay } from '../components/AceternityUI';

export function ResetPasswordPage({ onDone }) {
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew]                 = useState(false);
    const [showConfirm, setShowConfirm]         = useState(false);
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState('');
    const [success, setSuccess]                 = useState(false);

    const labelStyle = {
        fontSize: 10,
        color: 'var(--primary)',
        marginBottom: 6,
        display: 'block',
        fontFamily: 'var(--font-interface)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error: err } = await updatePassword(newPassword);
            if (err) setError('Erro: ' + err.message);
            else setSuccess(true);
        } catch (err) {
            setError('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', overflow: 'hidden', background: '#000' }}>
            <div className="tactical-grid-bg" />
            <div className="tactical-particles" />
            <BackgroundBeams className="z-0 opacity-40" />
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.06), transparent 70%)', top: '-15%', right: '-10%', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="card"
                style={{ width: '100%', maxWidth: 420, padding: '40px 36px', position: 'relative', zIndex: 1, background: 'rgba(5,5,5,0.85)', border: '1px solid rgba(0,240,255,0.25)', boxShadow: '0 0 60px rgba(0,240,255,0.06)', backdropFilter: 'blur(20px)' }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.6 }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="glow-cyan animate-float" style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Zap size={30} color="black" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-system)', fontSize: 22, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--primary)', textShadow: '0 0 20px rgba(0,240,255,0.6)', margin: 0 }}>
                        THE SYSTEM
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6, fontFamily: 'var(--font-interface)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        ▸ REDEFINIR SENHA DE ACESSO
                    </p>
                </div>

                {success ? (
                    /* ── SUCESSO ── */
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: 'var(--success)', fontFamily: 'var(--font-interface)', fontSize: 13, letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>
                            SENHA ATUALIZADA!
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', fontSize: 10, letterSpacing: '0.04em', marginBottom: 28 }}>
                            Sua nova senha foi definida com sucesso.
                        </p>
                        <button
                            onClick={onDone}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 12, fontFamily: 'var(--font-interface)', letterSpacing: '0.12em' }}
                        >
                            ENTRAR NO SISTEMA →
                        </button>
                    </div>
                ) : (
                    /* ── FORMULÁRIO ── */
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div>
                            <label style={labelStyle}>NOVA SENHA</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Lock size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    autoFocus
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                    placeholder="mínimo 6 caracteres"
                                    style={{ paddingLeft: 36, paddingRight: 44 }}
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>CONFIRMAR SENHA</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Lock size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                                    placeholder="repita a nova senha"
                                    style={{ paddingLeft: 36, paddingRight: 44 }}
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,42,74,0.08)', border: '1px solid rgba(255,42,74,0.2)', borderRadius: 4 }}>
                                <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
                                <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-interface)', margin: 0, letterSpacing: '0.06em' }}>{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 12, marginTop: 4, fontFamily: 'var(--font-interface)', letterSpacing: '0.12em', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'SALVANDO...' : 'REDEFINIR SENHA'}
                        </button>
                    </form>
                )}

                <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', marginTop: 24, fontFamily: 'var(--font-interface)', letterSpacing: '0.06em' }}>
                    AUTENTICAÇÃO VIA SUPABASE — DADOS SEGUROS NA NUVEM
                </p>
            </motion.div>

            <ScanlineOverlay />
        </div>
    );
}
