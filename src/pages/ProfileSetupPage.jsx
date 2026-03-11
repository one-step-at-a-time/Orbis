import React, { useState } from 'react';
import {
    Zap, Sword, Sparkles, Target, Heart, Eye, Shield,
    BookOpen, Code2, TrendingUp, Activity, Palette,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { upsertProfile } from '../services/supabaseService';
import { BackgroundBeams, ScanlineOverlay } from '../components/AceternityUI';

const CLASSES = [
    { value: 'Guerreiro',     Icon: Sword,       desc: 'Força e resistência' },
    { value: 'Mago',          Icon: Sparkles,    desc: 'Inteligência e estratégia' },
    { value: 'Arqueiro',      Icon: Target,      desc: 'Precisão e agilidade' },
    { value: 'Curandeiro',    Icon: Heart,       desc: 'Equilíbrio e saúde' },
    { value: 'Assassino',     Icon: Eye,         desc: 'Velocidade e foco' },
    { value: 'Tanque',        Icon: Shield,      desc: 'Disciplina e persistência' },
    { value: 'Estudante',     Icon: BookOpen,    desc: 'Aprendizado constante' },
    { value: 'Desenvolvedor', Icon: Code2,       desc: 'Lógica e criação' },
    { value: 'Empreendedor',  Icon: TrendingUp,  desc: 'Visão e execução' },
    { value: 'Atleta',        Icon: Activity,    desc: 'Performance e evolução' },
    { value: 'Criativo',      Icon: Palette,     desc: 'Inovação e expressão' },
];

export function ProfileSetupPage({ onSave, userId }) {
    const [nome, setNome]       = useState('');
    const [classe, setClasse]   = useState('Guerreiro');
    const [objetivo, setObjetivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nome.trim()) { setError('O Sistema exige uma identificação, Caçador.'); return; }
        setLoading(true);
        const profile = { nome: nome.trim(), classe, objetivo: objetivo.trim() };
        // Sync para Supabase em background (fire-and-forget)
        upsertProfile(userId, profile).catch(console.error);
        // Salva localmente e entra no app
        onSave(profile);
        setLoading(false);
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

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '32px 16px',
            position: 'relative',
            overflow: 'hidden',
            background: '#000',
        }}>
            {/* Fundo */}
            <div className="tactical-grid-bg" />
            <div className="tactical-particles" />
            <BackgroundBeams className="z-0 opacity-40" />
            <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.05), transparent 70%)', top: '-20%', right: '-10%', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="card"
                style={{
                    width: '100%',
                    maxWidth: 560,
                    padding: '40px 36px',
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(5,5,5,0.85)',
                    border: '1px solid rgba(0,240,255,0.25)',
                    boxShadow: '0 0 60px rgba(0,240,255,0.06)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Scanner line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.6 }} />

                {/* Cabeçalho */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        className="glow-cyan animate-float"
                        style={{
                            width: 56, height: 56, borderRadius: 16,
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 14px',
                        }}
                    >
                        <Zap size={26} color="black" strokeWidth={2.5} />
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 20, fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--primary)',
                        textShadow: '0 0 20px rgba(0,240,255,0.6)',
                        margin: 0,
                    }}>
                        CONFIGURAÇÃO DO AGENTE
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6, fontFamily: 'var(--font-interface)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        ▸ NOVO CAÇADOR DETECTADO — REGISTRO OBRIGATÓRIO
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Nome */}
                    <div>
                        <label style={labelStyle}>IDENTIFICAÇÃO *</label>
                        <input
                            autoFocus
                            type="text"
                            value={nome}
                            onChange={e => { setNome(e.target.value); setError(''); }}
                            placeholder="Seu nome ou codinome"
                            autoComplete="off"
                        />
                    </div>

                    {/* Seleção de Classe */}
                    <div>
                        <label style={labelStyle}>CLASSE DO CAÇADOR</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                        }}>
                            {CLASSES.map(({ value, Icon, desc }) => {
                                const selected = classe === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setClasse(value)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '12px 6px',
                                            border: selected
                                                ? '1px solid var(--primary)'
                                                : '1px solid rgba(0,240,255,0.12)',
                                            borderRadius: 6,
                                            background: selected
                                                ? 'rgba(0,240,255,0.08)'
                                                : 'rgba(0,0,0,0.4)',
                                            cursor: 'pointer',
                                            transition: 'all 0.18s',
                                            boxShadow: selected
                                                ? '0 0 12px rgba(0,240,255,0.15)'
                                                : 'none',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Icon
                                            size={18}
                                            color={selected ? 'var(--primary)' : 'var(--text-muted)'}
                                            strokeWidth={selected ? 2.2 : 1.8}
                                        />
                                        <span style={{
                                            fontFamily: 'var(--font-system)',
                                            fontSize: 9,
                                            fontWeight: selected ? 700 : 500,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            color: selected ? 'var(--primary)' : 'var(--text-secondary)',
                                            lineHeight: 1.2,
                                        }}>
                                            {value}
                                        </span>
                                        <span style={{
                                            fontSize: 8,
                                            color: selected ? 'var(--text-secondary)' : 'var(--text-muted)',
                                            fontFamily: 'var(--font-interface)',
                                            letterSpacing: '0.04em',
                                            lineHeight: 1.3,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {desc}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Objetivo */}
                    <div>
                        <label style={labelStyle}>OBJETIVO PRINCIPAL <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
                        <input
                            type="text"
                            value={objetivo}
                            onChange={e => setObjetivo(e.target.value)}
                            placeholder="O que você quer conquistar?"
                            autoComplete="off"
                        />
                    </div>

                    {/* Erro */}
                    {error && (
                        <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-interface)', letterSpacing: '0.06em', margin: 0 }}>
                            [ ERRO ]: {error}
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
                            fontFamily: 'var(--font-interface)',
                            letterSpacing: '0.12em',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'PROCESSANDO...' : 'INICIAR JORNADA →'}
                    </button>
                </form>
            </motion.div>

            <ScanlineOverlay />
        </div>
    );
}
