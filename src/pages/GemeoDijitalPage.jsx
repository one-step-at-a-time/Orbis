// GÊMEO DIGITAL — Módulo de Saúde Holística
// SVG holográfico + dados reais + análise IA inline.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, HeartPulse, Cpu, X, ChevronRight, Activity, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Loader } from 'lucide-react';
import { CornerBrackets } from '../components/AceternityUI';
import { usePlayer } from '../context/PlayerContext';
import { useMissions } from '../context/MissionContext';
import { useAppData } from '../context/DataContext';
import { callAiProvider } from '../services/aiProviderService';

// ─── Paleta de camadas ────────────────────────────────────────────────────────

const LAYERS = [
  { id: 'all',        label: 'TODOS',      color: '#00F0FF', icon: Cpu        },
  { id: 'fisico',     label: 'FÍSICO',     color: '#FF2A4A', icon: Zap        },
  { id: 'neural',     label: 'NEURAL',     color: '#00F0FF', icon: Brain      },
  { id: 'vitalidade', label: 'VITALIDADE', color: '#00FF9D', icon: HeartPulse },
];

const GROUP_META = {
  neural:     { label: 'Sistema Neural',      icon: Brain,      color: '#00F0FF' },
  vitalidade: { label: 'Sistema de Vitalidade', icon: HeartPulse, color: '#00FF9D' },
  fisico:     { label: 'Sistema Físico',      icon: Zap,        color: '#FF2A4A' },
};

// ─── Helpers de IA ───────────────────────────────────────────────────────────

function getStoredKey(name) {
  try {
    const raw = localStorage.getItem(name);
    if (!raw) return '';
    return JSON.parse(raw);
  } catch { return raw || ''; }
}

function getAiConfig() {
  return {
    provider: getStoredKey('orbis_ai_provider') || 'gemini',
    model:    getStoredKey('orbis_ai_model')    || 'gemini-2.5-flash',
    key:      getStoredKey('orbis_gemini_key')
           || getStoredKey('orbis_zhipu_key')
           || getStoredKey('orbis_siliconflow_key')
           || getStoredKey('orbis_openrouter_key'),
  };
}

function buildHealthPrompt(group, data, playerLevel) {
  const meta = GROUP_META[group];
  const metricsText = data.metrics
    .map(m => `- ${m.label}: ${m.value}%`)
    .join('\n');
  const missionText = data.mission
    ? `Missão pendente: ${data.mission.label} (+${data.mission.xp} XP)`
    : 'Todas as missões do sistema concluídas hoje.';

  return `Analise o ${meta.label} do Caçador (Level ${playerLevel}) com base nos dados de hoje.

STATUS: ${data.status.label}
SCORE GERAL: ${data.score}/100

MÉTRICAS:
${metricsText}

${missionText}

Forneça uma análise direta (3-4 linhas): estado atual do sistema, impacto no progresso e uma recomendação específica e acionável para hoje. Sem asteriscos, sem markdown.`;
}

// ─── Componente: análise IA inline ────────────────────────────────────────────

function AIInsightBlock({ group, data, playerLevel }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error | no_key
  const [response, setResponse] = useState('');

  const analyze = useCallback(async () => {
    const { provider, model, key } = getAiConfig();
    if (!key) { setState('no_key'); return; }

    setState('loading');
    try {
      const prompt = buildHealthPrompt(group, data, playerLevel);
      const messages = [{ tipo: 'usuario', mensagem: prompt }];
      const result = await callAiProvider(provider, messages, key, { model });
      setResponse(result);
      setState('done');
    } catch (err) {
      setResponse(err.message || 'Falha na análise.');
      setState('error');
    }
  }, [group, data, playerLevel]);

  const color = GROUP_META[group].color;

  if (state === 'idle') {
    return (
      <button
        onClick={analyze}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 12px',
          background: `${color}08`,
          border: `1px solid ${color}30`,
          color, cursor: 'pointer', fontSize: 10,
          fontFamily: 'var(--font-system)', letterSpacing: '0.12em',
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.boxShadow = `0 0 12px ${color}20`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Sparkles size={11}/>
        ANALISAR COM NEURAL AI
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: `${color}06`, border: `1px solid ${color}20`,
        color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-system)', letterSpacing: '0.1em',
      }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader size={12} color={color}/>
        </motion.div>
        PROCESSANDO ANÁLISE...
      </div>
    );
  }

  if (state === 'no_key') {
    return (
      <div style={{ padding: '10px 12px', background: 'rgba(255,42,74,0.06)', border: '1px solid rgba(255,42,74,0.2)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Nenhuma chave de API configurada. Configure em Chat → Configurações para ativar a Neural AI.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '12px', background: `${color}06`,
        border: `1px solid ${color}25`,
        position: 'relative',
      }}
    >
      <CornerBrackets color={color + '50'} size={6} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <Sparkles size={10} color={color} opacity={0.7}/>
        <span style={{ fontSize: 8, color, fontFamily: 'var(--font-system)', letterSpacing: '0.15em' }}>
          NEURAL AI — ANÁLISE
        </span>
      </div>
      <p style={{
        fontSize: 11, color: state === 'error' ? '#FF2A4A' : 'var(--text-muted)',
        lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap',
      }}>
        {response}
      </p>
      <button
        onClick={() => { setState('idle'); setResponse(''); }}
        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-system)', letterSpacing: '0.1em', padding: 0 }}
      >
        ↩ nova análise
      </button>
    </motion.div>
  );
}

// ─── Hook: processa dados reais dos contextos ─────────────────────────────────

function useHealthData() {
  const { player } = usePlayer();
  const { missions, missionState } = useMissions();
  const { habits } = useAppData();

  const today = new Date().toISOString().split('T')[0];
  const stats = { STR: 0, VIT: 0, INT: 0, AGI: 0, SEN: 0, ...player.stats };

  // Normaliza stat para 0–100 (cada ponto = 5%, cap 100%)
  const normStat = (val) => Math.min(Math.round((val || 0) * 5), 100);

  // Verifica missão completa
  const missionDone = (id) => {
    const m = missions.find(m => m.id === id);
    if (!m) return false;
    if (m.type === 'counter') return (missionState.progress?.[id] || 0) >= m.max;
    return !!missionState.completed?.[id];
  };

  // Progresso de água (0–8)
  const waterProgress = missionState.progress?.agua || 0;

  // Hábitos concluídos hoje
  const habitsToday = habits.filter(h => h.logs?.some(l => l.data === today)).length;
  const habitRate = habits.length > 0 ? Math.round((habitsToday / habits.length) * 100) : null;

  // ── NEURAL ──
  const leituraOk   = missionDone('leitura');
  const meditacaoOk = missionDone('meditacao');
  const neuralScore = Math.round((normStat(stats.INT) + normStat(stats.SEN)) / 2);
  const neuralMissionsRate = [leituraOk, meditacaoOk].filter(Boolean).length * 50;

  const neuralStatus = leituraOk && meditacaoOk
    ? { label: 'Operacional',        color: '#00FF9D' }
    : leituraOk || meditacaoOk
    ? { label: 'Parcialmente Ativo', color: '#FFB800' }
    : { label: 'Subestimulado',      color: '#FF2A4A' };

  const neuralInsight = leituraOk && meditacaoOk
    ? 'Sistema neural calibrado. INT e SEN em progressão. Mantenha o ritmo diário.'
    : !leituraOk && !meditacaoOk
    ? 'Nenhuma atividade cognitiva registrada hoje. Leitura e meditação são essenciais para INT e SEN.'
    : !leituraOk
    ? 'Leitura pendente — a ausência compromete o ganho de INT diário.'
    : 'Meditação pendente — SEN vulnerável sem prática de foco.';

  const neuralMission = !leituraOk
    ? missions.find(m => m.id === 'leitura')
    : !meditacaoOk
    ? missions.find(m => m.id === 'meditacao')
    : null;

  // ── VITALIDADE ──
  const sonoOk  = missionDone('sono');
  const aguaOk  = missionDone('agua');
  const vitScore = normStat(stats.VIT);
  const hydration = Math.round((waterProgress / 8) * 100);

  const vitalStatus = sonoOk && aguaOk
    ? { label: 'Operacional',       color: '#00FF9D' }
    : !sonoOk && !aguaOk
    ? { label: 'Déficit Crítico',   color: '#FF2A4A' }
    : !sonoOk
    ? { label: 'Privação de Sono',  color: '#FF2A4A' }
    : { label: 'Déficit Hídrico',   color: '#FFB800' };

  const vitalInsight = sonoOk && aguaOk
    ? 'Recuperação e hidratação em dia. VIT em progresso sólido.'
    : !sonoOk && !aguaOk
    ? 'Sono e hidratação comprometidos. Risco elevado de queda em VIT.'
    : !sonoOk
    ? 'Sono insuficiente registrado. Recuperação muscular e cognitiva prejudicada.'
    : `Hidratação em ${waterProgress}/8 copos. Complete para garantir o bônus de VIT.`;

  const vitalMission = !aguaOk
    ? missions.find(m => m.id === 'agua')
    : !sonoOk
    ? missions.find(m => m.id === 'sono')
    : null;

  // ── FÍSICO ──
  const physicalIds = ['flexoes', 'abdominais', 'agachamentos', 'corrida'];
  const physicalDone = physicalIds.filter(id => missionDone(id));
  const physicalRate = Math.round((physicalDone.length / physicalIds.length) * 100);
  const strScore  = normStat(stats.STR);
  const agiScore  = normStat(stats.AGI);

  const fisicoStatus = physicalRate === 100
    ? { label: 'Treino Completo',   color: '#00FF9D' }
    : physicalRate >= 50
    ? { label: 'Recuperação Ativa', color: '#FFB800' }
    : physicalRate > 0
    ? { label: 'Iniciado',          color: '#FFB800' }
    : { label: 'Inativo',           color: '#FF2A4A' };

  const fisicoInsight = physicalRate === 100
    ? 'Todos os exercícios concluídos. STR e AGI em progressão máxima hoje.'
    : physicalRate === 0
    ? 'Nenhum treino registrado. STR e AGI estagnados hoje.'
    : `${physicalDone.length}/${physicalIds.length} exercícios concluídos. Continue para maximizar o ganho de STR/AGI.`;

  const pendingPhysical = physicalIds.find(id => !missionDone(id));
  const fisicoMission = pendingPhysical ? missions.find(m => m.id === pendingPhysical) : null;

  return {
    neural: {
      metrics: [
        { label: 'Foco Mental',   value: normStat(stats.INT) },
        { label: 'Serenidade',    value: normStat(stats.SEN) },
        { label: 'Ativ. Hoje',    value: neuralMissionsRate   },
      ],
      status:  neuralStatus,
      insight: neuralInsight,
      mission: neuralMission,
      score:   neuralScore,
    },
    vitalidade: {
      metrics: [
        { label: 'Hidratação',    value: hydration  },
        { label: 'Sono',          value: sonoOk ? 100 : 0 },
        { label: 'Vitalidade',    value: vitScore   },
      ],
      status:  vitalStatus,
      insight: vitalInsight,
      mission: vitalMission,
      score:   Math.round((hydration + (sonoOk ? 100 : 0) + vitScore) / 3),
    },
    fisico: {
      metrics: [
        { label: 'Força',         value: strScore     },
        { label: 'Agilidade',     value: agiScore     },
        { label: 'Treino Hoje',   value: physicalRate },
      ],
      status:  fisicoStatus,
      insight: fisicoInsight,
      mission: fisicoMission,
      score:   Math.round((strScore + agiScore + physicalRate) / 3),
    },
    habitRate,
    habitsToday,
    totalHabits: habits.length,
    playerLevel: player.level,
  };
}

// ─── Silhueta SVG ─────────────────────────────────────────────────────────────

function HumanSilhouette({ activeLayer, hoveredGroup, onGroupClick, onGroupHover, healthData }) {
  const isActive = (group) => activeLayer === 'all' || activeLayer === group;

  const groupOpacity = (group) => {
    if (!isActive(group)) return 0.08;
    if (hoveredGroup === group) return 1;
    return 0.55;
  };

  // Cor base da região: usa a cor do status de saúde (verde/amarelo/vermelho)
  const groupColor = (group) => {
    if (hoveredGroup === group || activeLayer === group) {
      return healthData[group]?.status?.color || GROUP_META[group].color;
    }
    return GROUP_META[group].color;
  };

  const groupFilter = (group) => {
    if (!isActive(group)) return 'none';
    const col = groupColor(group);
    if (hoveredGroup === group)
      return `drop-shadow(0 0 10px ${col}) drop-shadow(0 0 20px ${col}80)`;
    return `drop-shadow(0 0 4px ${col}80)`;
  };

  const hitProps = (group) => ({
    style: { cursor: 'pointer' },
    onClick: () => onGroupClick(group),
    onMouseEnter: () => onGroupHover(group),
    onMouseLeave: () => onGroupHover(null),
  });

  return (
    <svg
      viewBox="0 0 160 440"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 'auto', height: '100%', maxWidth: 220, maxHeight: 480, minHeight: 320 }}
    >
      <defs>
        <pattern id="scanlines" width="100%" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(0,240,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* ── NEURAL (cabeça + pescoço) ── */}
      <g
        style={{ opacity: groupOpacity('neural'), filter: groupFilter('neural'), transition: 'opacity 0.3s, filter 0.3s' }}
        {...hitProps('neural')}
      >
        <ellipse cx="80" cy="34" rx="28" ry="32" fill="none" stroke={groupColor('neural')} strokeWidth="1.8"/>
        <line x1="80" y1="2" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="1.2"/>
        <line x1="60" y1="10" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="0.8" opacity="0.5"/>
        <line x1="100" y1="10" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="0.8" opacity="0.5"/>
        <circle cx="80" cy="22" r="2.5" fill={groupColor('neural')} opacity="0.7"/>
        <circle cx="80" cy="22" r="5" fill="none" stroke={groupColor('neural')} strokeWidth="0.6" opacity="0.4"/>
        <rect x="64" y="34" width="10" height="4" rx="2" fill={groupColor('neural')} opacity="0.6"/>
        <rect x="86" y="34" width="10" height="4" rx="2" fill={groupColor('neural')} opacity="0.6"/>
        <rect x="70" y="66" width="20" height="18" rx="2" fill="none" stroke={groupColor('neural')} strokeWidth="1.5"/>
      </g>

      {/* ── VITALIDADE (torso) ── */}
      <g
        style={{ opacity: groupOpacity('vitalidade'), filter: groupFilter('vitalidade'), transition: 'opacity 0.3s, filter 0.3s' }}
        {...hitProps('vitalidade')}
      >
        <path d="M42 90 Q30 95 28 108 L36 110 Q44 96 58 92 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        <path d="M118 90 Q130 95 132 108 L124 110 Q116 96 102 92 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        <path d="M58 86 L102 86 L108 140 L104 200 L56 200 L52 140 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.8"/>
        {[100, 112, 124, 136].map((y, i) => (
          <React.Fragment key={i}>
            <line x1="58" y1={y} x2="76" y2={y + 2} stroke={groupColor('vitalidade')} strokeWidth="0.8" opacity="0.35"/>
            <line x1="102" y1={y} x2="84" y2={y + 2} stroke={groupColor('vitalidade')} strokeWidth="0.8" opacity="0.35"/>
          </React.Fragment>
        ))}
        <path d="M72 110 Q72 104 78 104 Q84 104 84 110 Q84 116 78 122 Q72 116 72 110 Z"
          fill={groupColor('vitalidade')} opacity="0.25" stroke={groupColor('vitalidade')} strokeWidth="1"/>
        <line x1="80" y1="86" x2="80" y2="200" stroke={groupColor('vitalidade')} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.3"/>
        <path d="M56 200 L104 200 L106 240 L54 240 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        <line x1="68" y1="205" x2="68" y2="238" stroke={groupColor('vitalidade')} strokeWidth="0.6" opacity="0.2"/>
        <line x1="80" y1="205" x2="80" y2="238" stroke={groupColor('vitalidade')} strokeWidth="0.6" opacity="0.2"/>
        <line x1="92" y1="205" x2="92" y2="238" stroke={groupColor('vitalidade')} strokeWidth="0.6" opacity="0.2"/>
        <line x1="56" y1="218" x2="104" y2="218" stroke={groupColor('vitalidade')} strokeWidth="0.6" opacity="0.2"/>
      </g>

      {/* ── FÍSICO (braços + pernas) ── */}
      <g
        style={{ opacity: groupOpacity('fisico'), filter: groupFilter('fisico'), transition: 'opacity 0.3s, filter 0.3s' }}
        {...hitProps('fisico')}
      >
        <path d="M28 108 L20 108 L16 170 L28 170 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M18 170 L12 170 L10 230 L22 230 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <rect x="9" y="230" width="14" height="12" rx="3" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        <path d="M132 108 L140 108 L144 170 L132 170 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M142 170 L148 170 L150 230 L138 230 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <rect x="137" y="230" width="14" height="12" rx="3" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        <rect x="54" y="240" width="52" height="22" rx="2" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M54 262 L50 262 L48 340 L62 340 L64 262 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M48 340 L44 340 L44 410 L62 410 L62 340 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M44 408 L62 408 L64 422 L40 422 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        <path d="M96 262 L106 262 L112 340 L98 340 L96 262 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M98 340 L116 340 L116 410 L98 410 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        <path d="M98 408 L116 408 L120 422 L96 422 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        <circle cx="55" cy="344" r="5" fill="none" stroke={groupColor('fisico')} strokeWidth="1" opacity="0.5"/>
        <circle cx="107" cy="344" r="5" fill="none" stroke={groupColor('fisico')} strokeWidth="1" opacity="0.5"/>
      </g>

      {/* Scan lines */}
      <rect x="0" y="0" width="160" height="440" fill="url(#scanlines)" pointerEvents="none" opacity="0.5"/>

      {/* HUD cantos */}
      <g opacity="0.25" pointerEvents="none">
        <line x1="0" y1="0" x2="12" y2="0" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="0" y1="0" x2="0" y2="12" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="148" y1="0" x2="160" y2="0" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="160" y1="0" x2="160" y2="12" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="0" y1="428" x2="0" y2="440" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="0" y1="440" x2="12" y2="440" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="160" y1="428" x2="160" y2="440" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="148" y1="440" x2="160" y2="440" stroke="#00F0FF" strokeWidth="1"/>
      </g>
    </svg>
  );
}

// ─── Scanner animado ──────────────────────────────────────────────────────────

function ScannerLine() {
  return (
    <motion.div
      style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.7), transparent)',
        boxShadow: '0 0 12px rgba(0,240,255,0.5)',
        pointerEvents: 'none', zIndex: 2,
      }}
      animate={{ top: ['5%', '95%', '5%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Painel de análise com dados reais ───────────────────────────────────────

function AnalysisPanel({ group, healthData, onClose }) {
  if (!group) return null;
  const meta        = GROUP_META[group];
  const data        = healthData[group];
  const playerLevel = healthData.playerLevel;
  const Icon        = meta.icon;

  return (
    <motion.div
      key={group}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.22 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 280, background: 'rgba(0,4,5,0.97)',
        borderLeft: `1px solid ${meta.color}30`,
        display: 'flex', flexDirection: 'column',
        zIndex: 10, overflow: 'hidden',
      }}
    >
      <CornerBrackets color={meta.color + '60'} size={8} />

      {/* Cabeçalho */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${meta.color}20`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32,
          clipPath: 'polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)',
          background: `${meta.color}15`, border: `1px solid ${meta.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={meta.color}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em' }}>
            ANÁLISE DE SISTEMA
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, fontFamily: 'var(--font-system)', letterSpacing: '0.08em' }}>
            {meta.label.toUpperCase()}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
          <X size={14}/>
        </button>
      </div>

      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

        {/* Status real */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 6 }}>
            STATUS OPERACIONAL
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: `${data.status.color}10`,
            border: `1px solid ${data.status.color}40`,
            color: data.status.color,
            fontSize: 10, fontFamily: 'var(--font-system)', letterSpacing: '0.1em',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: data.status.color, boxShadow: `0 0 6px ${data.status.color}` }}/>
            {data.status.label}
          </span>
        </div>

        {/* Insight contextual */}
        <div style={{ padding: '10px 12px', background: `${meta.color}06`, border: `1px solid ${meta.color}20` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={12} color={meta.color} style={{ marginTop: 2, flexShrink: 0 }}/>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {data.insight}
            </p>
          </div>
        </div>

        {/* Missão real pendente */}
        {data.mission && (
          <div>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 6 }}>
              MISSÃO PENDENTE
            </div>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(0,4,5,0.8)',
              border: '1px solid rgba(0,240,255,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle size={12} color="rgba(0,240,255,0.5)"/>
                <span style={{ fontSize: 11, color: 'var(--text)' }}>{data.mission.label}</span>
              </div>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-system)', color: '#00FF9D',
                padding: '2px 8px', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)',
              }}>
                +{data.mission.xp} XP
              </span>
            </div>
          </div>
        )}

        {/* Métricas reais */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 8 }}>
            MÉTRICAS
          </div>
          {data.metrics.map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: 10, color: value >= 70 ? '#00FF9D' : value >= 40 ? '#FFB800' : '#FF2A4A', fontFamily: 'var(--font-system)' }}>
                  {value}%
                </span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  style={{
                    height: '100%',
                    background: value >= 70 ? '#00FF9D' : value >= 40 ? '#FFB800' : '#FF2A4A',
                    boxShadow: `0 0 6px ${value >= 70 ? '#00FF9D' : value >= 40 ? '#FFB800' : '#FF2A4A'}`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Score geral */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(0,240,255,0.03)',
          border: '1px solid rgba(0,240,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <TrendingUp size={14} color={meta.color} opacity={0.7}/>
          <div>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.12em' }}>
              SCORE DO SISTEMA
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: meta.color, fontFamily: 'var(--font-system)' }}>
              {data.score}<span style={{ fontSize: 10, opacity: 0.5 }}>/100</span>
            </div>
          </div>
        </div>

        {/* ── Análise IA ── */}
        <AIInsightBlock group={group} data={data} playerLevel={playerLevel} />

      </div>

      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${meta.color}15`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Activity size={10} color={meta.color} style={{ opacity: 0.6 }}/>
        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.1em' }}>
          DADOS EM TEMPO REAL
        </span>
      </div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GemeoDijitalPage() {
  const [activeLayer, setActiveLayer]   = useState('all');
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scanKey, setScanKey] = useState(0);

  const healthData = useHealthData();

  useEffect(() => {
    setScanKey(k => k + 1);
    setSelectedGroup(null);
  }, [activeLayer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden', background: '#000000' }}>

      {/* ── Cabeçalho ── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(0,240,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 8, color: 'rgba(0,240,255,0.4)', fontFamily: 'var(--font-system)', letterSpacing: '0.2em' }}>
            MÓDULO
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#00F0FF', fontFamily: 'var(--font-system)', letterSpacing: '0.15em' }}>
            GÊMEO DIGITAL
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6 }}>
          {LAYERS.map(layer => {
            const Icon = layer.icon;
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px',
                  background: isActive ? `${layer.color}15` : 'transparent',
                  border: `1px solid ${isActive ? layer.color + '60' : 'rgba(0,240,255,0.12)'}`,
                  color: isActive ? layer.color : 'var(--text-dim)',
                  cursor: 'pointer', fontSize: 9,
                  fontFamily: 'var(--font-system)', letterSpacing: '0.12em',
                  transition: 'all 0.18s',
                  boxShadow: isActive ? `0 0 10px ${layer.color}20` : 'none',
                }}
              >
                <Icon size={11}/>
                {layer.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Corpo ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 300, position: 'relative' }}>

        {/* Área holograma */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', padding: 24,
        }}>
          {/* Grid de fundo */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}/>

          {/* Glow base */}
          <div style={{
            position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
            width: 140, height: 20,
            background: 'radial-gradient(ellipse, rgba(0,240,255,0.15), transparent 70%)',
            pointerEvents: 'none',
          }}/>

          {/* Scanner + Silhueta */}
          <div style={{ position: 'relative', flex: 1, maxHeight: 480, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScannerLine key={scanKey} />
            <HumanSilhouette
              activeLayer={activeLayer}
              hoveredGroup={hoveredGroup}
              healthData={healthData}
              onGroupClick={(group) => setSelectedGroup(s => s === group ? null : group)}
              onGroupHover={setHoveredGroup}
            />
          </div>

          {/* Dica */}
          {!selectedGroup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 9, color: 'rgba(0,240,255,0.35)',
                fontFamily: 'var(--font-system)', letterSpacing: '0.12em', whiteSpace: 'nowrap',
              }}
            >
              <ChevronRight size={10}/>
              CLIQUE EM UMA REGIÃO DO HOLOGRAMA
            </motion.div>
          )}

          {/* Label hover */}
          <AnimatePresence>
            {hoveredGroup && (
              <motion.div
                key={hoveredGroup}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                style={{
                  position: 'absolute', top: 20,
                  padding: '4px 12px',
                  background: `${GROUP_META[hoveredGroup].color}10`,
                  border: `1px solid ${GROUP_META[hoveredGroup].color}40`,
                  color: GROUP_META[hoveredGroup].color,
                  fontSize: 10, fontFamily: 'var(--font-system)', letterSpacing: '0.15em',
                  pointerEvents: 'none',
                }}
              >
                {GROUP_META[hoveredGroup].label.toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Painel lateral */}
        <AnimatePresence>
          {selectedGroup && (
            <AnalysisPanel
              group={selectedGroup}
              healthData={healthData}
              onClose={() => setSelectedGroup(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
