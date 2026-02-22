// GÊMEO DIGITAL — Módulo de Saúde Holística
// SVG holográfico + CSS puro. Sem dependências externas de 3D.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, HeartPulse, Cpu, X, ChevronRight, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { CornerBrackets } from '../components/AceternityUI';

// ─── Paleta de camadas ────────────────────────────────────────────────────────

const LAYERS = [
  { id: 'all',        label: 'TODOS',      color: '#00F0FF', icon: Cpu       },
  { id: 'fisico',     label: 'FÍSICO',     color: '#FF2A4A', icon: Zap       },
  { id: 'neural',     label: 'NEURAL',     color: '#00F0FF', icon: Brain     },
  { id: 'vitalidade', label: 'VITALIDADE', color: '#00FF9D', icon: HeartPulse },
];

const GROUP_META = {
  neural: {
    label: 'Sistema Neural',
    icon: Brain,
    color: '#00F0FF',
    description: 'Córtex pré-frontal, hipocampo e rede de modo padrão.',
  },
  vitalidade: {
    label: 'Sistema de Vitalidade',
    icon: HeartPulse,
    color: '#00FF9D',
    description: 'Cardiovascular, respiratório e homeostase metabólica.',
  },
  fisico: {
    label: 'Sistema Físico',
    icon: Zap,
    color: '#FF2A4A',
    description: 'Musculatura esquelética, articulações e sistema locomotor.',
  },
};

const MOCK_ANALYSES = {
  neural: {
    status: 'Sobrecarga Detectada',
    statusColor: '#FFB800',
    insight: 'Fragmentação do ciclo de sono compromete consolidação de memória.',
    suggested_mission: { title: 'Dormir 8h ininterruptas', reward: '+2 INT' },
  },
  vitalidade: {
    status: 'Operacional',
    statusColor: '#00FF9D',
    insight: 'Frequência cardíaca em repouso estável. Hidratação abaixo do ideal.',
    suggested_mission: { title: 'Beber 3L de água hoje', reward: '+2 VIT' },
  },
  fisico: {
    status: 'Recuperação Ativa',
    statusColor: '#FF2A4A',
    insight: 'Microlesões musculares indicam treino intenso. Proteína insuficiente.',
    suggested_mission: { title: 'Ingestão: 2g proteína/kg', reward: '+3 STR' },
  },
};

// ─── Silhueta SVG ─────────────────────────────────────────────────────────────

function HumanSilhouette({ activeLayer, hoveredGroup, onGroupClick, onGroupHover }) {
  const isActive = (group) => activeLayer === 'all' || activeLayer === group;

  const groupOpacity = (group) => {
    if (!isActive(group)) return 0.08;
    if (hoveredGroup === group) return 1;
    return 0.55;
  };

  const groupColor = (group) => GROUP_META[group].color;

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
      style={{ width: '100%', height: '100%', maxWidth: 220, maxHeight: 480 }}
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
        {/* Cabeça */}
        <ellipse cx="80" cy="34" rx="28" ry="32" fill="none" stroke={groupColor('neural')} strokeWidth="1.8"/>
        {/* Detalhe topo */}
        <line x1="80" y1="2" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="1.2"/>
        <line x1="60" y1="10" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="0.8" opacity="0.5"/>
        <line x1="100" y1="10" x2="80" y2="8" stroke={groupColor('neural')} strokeWidth="0.8" opacity="0.5"/>
        {/* Ponto HUD */}
        <circle cx="80" cy="22" r="2.5" fill={groupColor('neural')} opacity="0.7"/>
        <circle cx="80" cy="22" r="5" fill="none" stroke={groupColor('neural')} strokeWidth="0.6" opacity="0.4"/>
        {/* Olhos */}
        <rect x="64" y="34" width="10" height="4" rx="2" fill={groupColor('neural')} opacity="0.6"/>
        <rect x="86" y="34" width="10" height="4" rx="2" fill={groupColor('neural')} opacity="0.6"/>
        {/* Pescoço */}
        <rect x="70" y="66" width="20" height="18" rx="2" fill="none" stroke={groupColor('neural')} strokeWidth="1.5"/>
      </g>

      {/* ── VITALIDADE (torso) ── */}
      <g
        style={{ opacity: groupOpacity('vitalidade'), filter: groupFilter('vitalidade'), transition: 'opacity 0.3s, filter 0.3s' }}
        {...hitProps('vitalidade')}
      >
        {/* Ombros */}
        <path d="M42 90 Q30 95 28 108 L36 110 Q44 96 58 92 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        <path d="M118 90 Q130 95 132 108 L124 110 Q116 96 102 92 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        {/* Torso */}
        <path d="M58 86 L102 86 L108 140 L104 200 L56 200 L52 140 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.8"/>
        {/* Costelas */}
        {[100, 112, 124, 136].map((y, i) => (
          <React.Fragment key={i}>
            <line x1="58" y1={y} x2="76" y2={y + 2} stroke={groupColor('vitalidade')} strokeWidth="0.8" opacity="0.35"/>
            <line x1="102" y1={y} x2="84" y2={y + 2} stroke={groupColor('vitalidade')} strokeWidth="0.8" opacity="0.35"/>
          </React.Fragment>
        ))}
        {/* Coração */}
        <path d="M72 110 Q72 104 78 104 Q84 104 84 110 Q84 116 78 122 Q72 116 72 110 Z"
          fill={groupColor('vitalidade')} opacity="0.25" stroke={groupColor('vitalidade')} strokeWidth="1"/>
        {/* Coluna */}
        <line x1="80" y1="86" x2="80" y2="200" stroke={groupColor('vitalidade')} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.3"/>
        {/* Abdômen */}
        <path d="M56 200 L104 200 L106 240 L54 240 Z" fill="none" stroke={groupColor('vitalidade')} strokeWidth="1.5"/>
        {/* Grid abdominal */}
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
        {/* Braço esq. superior */}
        <path d="M28 108 L20 108 L16 170 L28 170 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Braço esq. inferior */}
        <path d="M18 170 L12 170 L10 230 L22 230 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Mão esq. */}
        <rect x="9" y="230" width="14" height="12" rx="3" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        {/* Braço dir. superior */}
        <path d="M132 108 L140 108 L144 170 L132 170 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Braço dir. inferior */}
        <path d="M142 170 L148 170 L150 230 L138 230 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Mão dir. */}
        <rect x="137" y="230" width="14" height="12" rx="3" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        {/* Quadril */}
        <rect x="54" y="240" width="52" height="22" rx="2" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Coxa esq. */}
        <path d="M54 262 L50 262 L48 340 L62 340 L64 262 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Perna esq. */}
        <path d="M48 340 L44 340 L44 410 L62 410 L62 340 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Pé esq. */}
        <path d="M44 408 L62 408 L64 422 L40 422 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        {/* Coxa dir. */}
        <path d="M96 262 L106 262 L112 340 L98 340 L96 262 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Perna dir. */}
        <path d="M98 340 L116 340 L116 410 L98 410 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.5"/>
        {/* Pé dir. */}
        <path d="M98 408 L116 408 L120 422 L96 422 Z" fill="none" stroke={groupColor('fisico')} strokeWidth="1.2"/>
        {/* Joelhos */}
        <circle cx="55" cy="344" r="5" fill="none" stroke={groupColor('fisico')} strokeWidth="1" opacity="0.5"/>
        <circle cx="107" cy="344" r="5" fill="none" stroke={groupColor('fisico')} strokeWidth="1" opacity="0.5"/>
      </g>

      {/* Scan lines overlay */}
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
        position: 'absolute', left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.7), transparent)',
        boxShadow: '0 0 12px rgba(0,240,255,0.5)',
        pointerEvents: 'none',
        zIndex: 2,
      }}
      animate={{ top: ['5%', '95%', '5%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Painel de análise ────────────────────────────────────────────────────────

function AnalysisPanel({ group, onClose }) {
  if (!group) return null;
  const meta = GROUP_META[group];
  const analysis = MOCK_ANALYSES[group];
  const Icon = meta.icon;

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

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

        {/* Status */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 6 }}>
            STATUS OPERACIONAL
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: `${analysis.statusColor}10`,
            border: `1px solid ${analysis.statusColor}40`,
            color: analysis.statusColor,
            fontSize: 10, fontFamily: 'var(--font-system)', letterSpacing: '0.1em',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: analysis.statusColor, boxShadow: `0 0 6px ${analysis.statusColor}` }}/>
            {analysis.status}
          </span>
        </div>

        {/* Descrição */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 6 }}>
            DIAGNÓSTICO
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {meta.description}
          </p>
        </div>

        {/* Insight */}
        <div style={{ padding: '10px 12px', background: `${meta.color}06`, border: `1px solid ${meta.color}20` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={12} color={meta.color} style={{ marginTop: 2, flexShrink: 0 }}/>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {analysis.insight}
            </p>
          </div>
        </div>

        {/* Missão sugerida */}
        {analysis.suggested_mission && (
          <div>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 6 }}>
              MISSÃO SUGERIDA
            </div>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(0,4,5,0.8)',
              border: '1px solid rgba(0,240,255,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle size={12} color="rgba(0,240,255,0.5)"/>
                <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{analysis.suggested_mission.title}</span>
              </div>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-system)', color: '#00FF9D',
                padding: '2px 8px', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)',
              }}>
                {analysis.suggested_mission.reward}
              </span>
            </div>
          </div>
        )}

        {/* Métricas */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.15em', marginBottom: 8 }}>
            MÉTRICAS
          </div>
          {[
            { label: 'Integridade', value: group === 'fisico' ? 72 : group === 'neural' ? 65 : 88 },
            { label: 'Eficiência',  value: group === 'fisico' ? 81 : group === 'neural' ? 57 : 91 },
            { label: 'Recuperação', value: group === 'fisico' ? 44 : group === 'neural' ? 70 : 95 },
          ].map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: 10, color: meta.color, fontFamily: 'var(--font-system)' }}>{value}%</span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  style={{ height: '100%', background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${meta.color}15`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Activity size={10} color={meta.color} style={{ opacity: 0.6 }}/>
        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.1em' }}>
          SINCRONIZADO EM TEMPO REAL
        </span>
      </div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GemeoDijitalPage() {
  const [activeLayer, setActiveLayer] = useState('all');
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    setScanKey(k => k + 1);
    setSelectedGroup(null);
  }, [activeLayer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#000000' }}>

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
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', overflow: 'hidden' }}>

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
          <div style={{ position: 'relative', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScannerLine key={scanKey} />
            <HumanSilhouette
              activeLayer={activeLayer}
              hoveredGroup={hoveredGroup}
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
              onClose={() => setSelectedGroup(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
