// GÊMEO DIGITAL — Saúde Holística
// Módulo isolado: não modifica nenhum contexto global existente.
// Integra-se ao roteador via App.jsx (page: 'gemeodigital').

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Shield, X, Send, ChevronRight,
  Activity, Cpu, HeartPulse, AlertTriangle, Settings,
  CheckCircle, Clock, Database,
} from 'lucide-react';
import { DigitalTwinScene } from '../components/3d/DigitalTwinScene';
import { isSupabaseConfigured } from '../services/supabaseService';
import { CornerBrackets } from '../components/AceternityUI';

// ─── Configuração das camadas ─────────────────────────────────────────────────

const LAYERS = [
  { id: 'all',        label: 'TODOS',      color: '#06b6d4',  icon: Cpu       },
  { id: 'fisico',     label: 'FÍSICO',     color: '#ef4444',  icon: Zap       },
  { id: 'neural',     label: 'NEURAL',     color: '#06b6d4',  icon: Brain     },
  { id: 'vitalidade', label: 'VITALIDADE', color: '#00ff9d',  icon: HeartPulse },
];

const GROUP_META = {
  neural: {
    label: 'Sistema Neural',
    icon: Brain,
    color: '#06b6d4',
    description: 'Córtex pré-frontal, hipocampo e rede neural padrão.',
  },
  vitalidade: {
    label: 'Sistema de Vitalidade',
    icon: HeartPulse,
    color: '#00ff9d',
    description: 'Cardiovascular, respiratório e homeostase metabólica.',
  },
  fisico: {
    label: 'Sistema Físico',
    icon: Zap,
    color: '#ef4444',
    description: 'Musculatura esquelética, articulações e sistema locomotor.',
  },
};

// ─── Mock data para PASSO 2 ───────────────────────────────────────────────────

const MOCK_ANALYSES = {
  neural: {
    layer: 'neural',
    status: 'Sobrecarga Detectada',
    statusColor: '#f59e0b',
    insight: 'Fragmentação do ciclo de sono compromete consolidação de memória.',
    suggested_mission: { title: 'Dormir 8h ininterruptas', reward: '+2 INT' },
  },
  vitalidade: {
    layer: 'vitalidade',
    status: 'Operacional',
    statusColor: '#00ff9d',
    insight: 'Frequência cardíaca em repouso estável. Hidratação abaixo do ideal.',
    suggested_mission: { title: 'Beber 3L de água hoje', reward: '+2 VIT' },
  },
  fisico: {
    layer: 'fisico',
    status: 'Recuperação Ativa',
    statusColor: '#ef4444',
    insight: 'Microlesões musculares indicam treino intenso. Proteína insuficiente.',
    suggested_mission: { title: 'Ingestão: 2g proteína/kg', reward: '+3 STR' },
  },
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Badge de status com cor dinâmica */
function StatusBadge({ status, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: `${color}15`, border: `1px solid ${color}40`,
      color, fontSize: 10, fontFamily: 'var(--font-system)',
      letterSpacing: '0.12em', fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      {status}
    </span>
  );
}

/** Painel flutuante direito com análise do grupo clicado */
function AnalysisPanel({ group, analysis, onClose }) {
  if (!group) return null;
  const meta = GROUP_META[group];
  if (!meta) return null;
  const IconComponent = meta.icon;

  return (
    <motion.div
      key={group}
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      style={{
        position: 'absolute',
        right: 0, top: 0, bottom: 0,
        width: 380,
        background: 'rgba(5,8,16,0.96)',
        borderLeft: `1px solid ${meta.color}30`,
        boxShadow: `-20px 0 60px rgba(0,0,0,0.6), inset 0 0 40px ${meta.color}05`,
        display: 'flex', flexDirection: 'column',
        zIndex: 20,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header do painel */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${meta.color}20`,
        background: `linear-gradient(135deg, ${meta.color}08, transparent)`,
        position: 'relative',
      }}>
        <CornerBrackets color={`${meta.color}60`} size={8} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: `${meta.color}15`,
            border: `1px solid ${meta.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 16px ${meta.color}30`,
          }}>
            <IconComponent size={16} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 8, fontFamily: 'var(--font-system)', letterSpacing: '0.18em', color: 'var(--text-dim)', marginBottom: 2 }}>
              SUBSISTEMA ATIVO
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: meta.color,
              fontFamily: 'var(--font-system)', letterSpacing: '0.06em',
              textShadow: `0 0 12px ${meta.color}60`,
            }}>
              {meta.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--text-dim)', cursor: 'pointer', padding: 4,
              borderRadius: 6, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          {meta.description}
        </p>
      </div>

      {/* Corpo do painel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {analysis ? (
          <>
            {/* Status */}
            <div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-system)', letterSpacing: '0.16em', color: 'var(--text-dim)', marginBottom: 8 }}>
                ▸ STATUS DO SUBSISTEMA
              </div>
              <StatusBadge status={analysis.status} color={analysis.statusColor} />
            </div>

            {/* Análise */}
            <div style={{
              padding: '12px 14px',
              background: `${meta.color}06`,
              border: `1px solid ${meta.color}20`,
              borderRadius: 8,
              position: 'relative',
            }}>
              <CornerBrackets color={`${meta.color}30`} size={6} />
              <div style={{ fontSize: 8, fontFamily: 'var(--font-system)', letterSpacing: '0.16em', color: meta.color, marginBottom: 6, opacity: 0.8 }}>
                ▸ ANÁLISE DE IA
              </div>
              <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                {analysis.insight}
              </p>
            </div>

            {/* Missão sugerida */}
            {analysis.suggested_mission && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(59,89,255,0.06)',
                border: '1px solid rgba(59,89,255,0.2)',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-system)', letterSpacing: '0.16em', color: 'var(--primary)', marginBottom: 8 }}>
                  ▸ MISSÃO CORRETIVA SUGERIDA
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>
                    {analysis.suggested_mission.title}
                  </span>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-system)', fontWeight: 700,
                    color: '#00ff9d', background: 'rgba(0,255,157,0.1)',
                    border: '1px solid rgba(0,255,157,0.25)',
                    padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap',
                  }}>
                    {analysis.suggested_mission.reward}
                  </span>
                </div>

                {/* Botão — reservado para integração RPG (PASSO 4) */}
                <button
                  style={{
                    marginTop: 10, width: '100%', padding: '8px 0',
                    borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(59,89,255,0.12)',
                    border: '1px solid rgba(59,89,255,0.3)',
                    color: 'var(--primary)',
                    fontSize: 10, fontFamily: 'var(--font-system)',
                    letterSpacing: '0.1em', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.18s',
                    opacity: 0.6,
                  }}
                  title="Integração RPG disponível no PASSO 4"
                  onClick={() => {
                    // Emite evento customizado — sem tocar em contextos globais
                    window.dispatchEvent(new CustomEvent('orbis:suggested-mission', {
                      detail: analysis.suggested_mission,
                    }));
                  }}
                >
                  <CheckCircle size={11} />
                  ACEITAR MISSÃO
                </button>
              </div>
            )}
          </>
        ) : (
          /* Estado vazio — aguardando análise */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '40px 20px', textAlign: 'center',
          }}>
            <Activity size={28} color={`${meta.color}60`} />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', lineHeight: 1.6 }}>
              Nenhuma análise disponível.{'\n'}
              Digite um log no terminal e pressione ENTER.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${meta.color}15`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Clock size={10} color="var(--text-dim)" />
        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)' }}>
          {new Date().toLocaleString('pt-BR')}
        </span>
      </div>
    </motion.div>
  );
}

/** Modal de configuração do Supabase */
function SupabaseSetupModal({ onClose, onSave }) {
  const [url, setUrl] = useState(localStorage.getItem('orbis_supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('orbis_supabase_anon_key') || '');

  const handleSave = () => {
    if (url.trim() && key.trim()) {
      localStorage.setItem('orbis_supabase_url', url.trim());
      localStorage.setItem('orbis_supabase_anon_key', key.trim());
      onSave();
      onClose();
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(6,182,212,0.05)',
    border: '1px solid rgba(6,182,212,0.25)',
    borderRadius: 6, color: 'var(--text)',
    fontSize: 11, fontFamily: 'var(--font-system)',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 440, padding: 28,
          background: 'rgba(5,8,16,0.98)',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 12,
          boxShadow: '0 0 40px rgba(6,182,212,0.15), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Database size={18} color="#06b6d4" />
          <h3 style={{ fontFamily: 'var(--font-system)', fontSize: 14, fontWeight: 700, color: '#06b6d4', letterSpacing: '0.08em', margin: 0 }}>
            CONFIGURAR SUPABASE
          </h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
          Configure as credenciais do Supabase para salvar seus logs biométricos na nuvem.
          As chaves são armazenadas no localStorage, consistente com as demais API keys do app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 9, fontFamily: 'var(--font-system)', color: 'var(--text-dim)', letterSpacing: '0.16em', display: 'block', marginBottom: 5 }}>
              PROJECT URL
            </label>
            <input
              style={inputStyle}
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontFamily: 'var(--font-system)', color: 'var(--text-dim)', letterSpacing: '0.16em', display: 'block', marginBottom: 5 }}>
              ANON PUBLIC KEY
            </label>
            <input
              style={inputStyle}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={e => setKey(e.target.value)}
              type="password"
            />
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', marginBottom: 16, padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6 }}>
          <strong style={{ color: '#f59e0b' }}>SQL necessário no Supabase:</strong>{'\n'}
          <code style={{ fontSize: 9, display: 'block', marginTop: 4, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            CREATE TABLE biometric_logs ({'\n'}
            {'  '}id UUID DEFAULT gen_random_uuid() PRIMARY KEY,{'\n'}
            {'  '}log_text TEXT NOT NULL,{'\n'}
            {'  '}ai_analysis_json JSONB,{'\n'}
            {'  '}created_at TIMESTAMPTZ DEFAULT NOW(){'\n'}
            );
          </code>
        </div>

        <button
          onClick={handleSave}
          disabled={!url.trim() || !key.trim()}
          style={{
            width: '100%', padding: '10px 0',
            borderRadius: 8, cursor: url && key ? 'pointer' : 'not-allowed',
            background: url && key ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,255,255,0.05)',
            border: 'none', color: 'white',
            fontSize: 11, fontFamily: 'var(--font-system)',
            fontWeight: 700, letterSpacing: '0.1em',
            transition: 'all 0.18s',
          }}
        >
          SALVAR CREDENCIAIS
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GemeoDijitalPage() {
  const [activeLayer, setActiveLayer] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [terminalInput, setTerminalInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured());
  const [cursorStyle, setCursorStyle] = useState('default');
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  // Lida com o clique em partes do corpo 3D
  const handleBodyClick = useCallback((group) => {
    setSelectedGroup(group);
    // Usa mock data por enquanto (PASSO 4 substituirá por dados reais da IA)
    setAnalysis(MOCK_ANALYSES[group] || null);
  }, []);

  // Hover do cursor para mudar estilo
  const handleHoverChange = useCallback((group) => {
    setHoveredGroup(group);
    setCursorStyle(group ? 'pointer' : 'default');
  }, []);

  // Submissão do terminal (PASSO 4 substituirá pelo fluxo real de IA)
  const handleTerminalSubmit = useCallback(async () => {
    const text = terminalInput.trim();
    if (!text || isAnalyzing) return;

    setIsAnalyzing(true);
    setTerminalInput('');

    // Adiciona ao histórico local
    const entry = { text, timestamp: new Date().toISOString(), id: Date.now() };
    setLogs(prev => [entry, ...prev].slice(0, 20));

    // Simula processamento (substituído por IA real no PASSO 4)
    await new Promise(r => setTimeout(r, 1200));

    // Mock: detecta keywords simples para escolher o grupo
    let mockGroup = 'neural';
    const lower = text.toLowerCase();
    if (lower.match(/treino|muscula|perna|bra|corri|academia|força/)) mockGroup = 'fisico';
    else if (lower.match(/coração|pressão|sono|respirar|cansar|energia|água/)) mockGroup = 'vitalidade';

    const mockAnalysis = MOCK_ANALYSES[mockGroup];
    setSelectedGroup(mockGroup);
    setAnalysis(mockAnalysis);
    setIsAnalyzing(false);
  }, [terminalInput, isAnalyzing]);

  // Focar no input ao montar
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: 240,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(6,182,212,0.04) 0%, #050508 60%)',
        cursor: cursorStyle,
      }}
    >
      {/* ── Canvas 3D (camada de fundo) ─────────────────────────── */}
      <DigitalTwinScene
        activeLayer={activeLayer}
        hoveredGroup={hoveredGroup}
        onBodyClick={handleBodyClick}
        onHoverChange={handleHoverChange}
      />

      {/* ── UI Overlay (camada sobre o canvas) ─────────────────── */}
      <div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* HEADER — Filtros de Camada */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            background: 'linear-gradient(180deg, rgba(5,8,16,0.96) 0%, transparent 100%)',
            pointerEvents: 'auto', zIndex: 10,
          }}
        >
          {/* Título */}
          <div style={{ marginRight: 8 }}>
            <div style={{ fontSize: 8, fontFamily: 'var(--font-system)', letterSpacing: '0.2em', color: 'var(--text-dim)' }}>
              MÓDULO
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-system)', fontWeight: 700, color: '#06b6d4', letterSpacing: '0.1em', textShadow: '0 0 12px rgba(6,182,212,0.5)' }}>
              GÊMEO DIGITAL
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(6,182,212,0.2)', margin: '0 6px' }} />

          {/* Botões de filtro */}
          {LAYERS.map(layer => {
            const IconComp = layer.icon;
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${isActive ? layer.color + '60' : 'rgba(255,255,255,0.06)'}`,
                  background: isActive ? `${layer.color}15` : 'rgba(255,255,255,0.02)',
                  color: isActive ? layer.color : 'var(--text-dim)',
                  fontSize: 9, fontFamily: 'var(--font-system)', fontWeight: 700,
                  letterSpacing: '0.12em',
                  boxShadow: isActive ? `0 0 12px ${layer.color}30` : 'none',
                  transition: 'all 0.18s',
                }}
              >
                <IconComp size={11} />
                {layer.label}
              </button>
            );
          })}

          {/* Espaçador */}
          <div style={{ flex: 1 }} />

          {/* Botão configurações Supabase */}
          <button
            onClick={() => setShowSetup(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${supabaseReady ? 'rgba(0,255,157,0.3)' : 'rgba(255,255,255,0.08)'}`,
              background: supabaseReady ? 'rgba(0,255,157,0.06)' : 'rgba(255,255,255,0.02)',
              color: supabaseReady ? '#00ff9d' : 'var(--text-dim)',
              fontSize: 9, fontFamily: 'var(--font-system)',
              transition: 'all 0.18s',
            }}
            title="Configurar Supabase"
          >
            <Database size={11} />
            {supabaseReady ? 'DB OK' : 'DB —'}
          </button>
        </div>

        {/* INDICADOR CENTRAL — instrução ao usuário */}
        {!selectedGroup && (
          <div
            style={{
              position: 'absolute', bottom: 100, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 16px',
              background: 'rgba(5,8,16,0.75)',
              border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: 20,
              pointerEvents: 'none',
            }}
          >
            <ChevronRight size={11} color="rgba(6,182,212,0.5)" />
            <span style={{ fontSize: 10, color: 'rgba(6,182,212,0.5)', fontFamily: 'var(--font-system)', letterSpacing: '0.12em' }}>
              CLIQUE EM UMA REGIÃO DO HOLOGRAMA
            </span>
          </div>
        )}

        {/* TERMINAL INFERIOR */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0,
            right: selectedGroup ? 380 : 0,
            padding: '10px 16px',
            background: 'rgba(5,8,16,0.94)',
            borderTop: '1px solid rgba(6,182,212,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto', zIndex: 10,
            transition: 'right 0.3s ease',
          }}
        >
          {/* Prompt label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isAnalyzing ? '#f59e0b' : '#06b6d4', boxShadow: `0 0 6px ${isAnalyzing ? '#f59e0b' : '#06b6d4'}`, animation: 'system-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-system)', color: isAnalyzing ? '#f59e0b' : '#06b6d4', letterSpacing: '0.12em', fontWeight: 700 }}>
              {isAnalyzing ? 'PROCESSANDO...' : 'NEURAL >'}
            </span>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            value={terminalInput}
            onChange={e => setTerminalInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTerminalSubmit(); }}
            disabled={isAnalyzing}
            placeholder="TRANSMIT NEURAL MESSAGE... (ex: dormi 4h, treinei perna, comi lixo)"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'var(--font-system)', fontSize: 12,
              caretColor: '#06b6d4',
              opacity: isAnalyzing ? 0.4 : 1,
            }}
          />

          {/* Botão enviar */}
          <button
            onClick={handleTerminalSubmit}
            disabled={!terminalInput.trim() || isAnalyzing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 5, cursor: terminalInput.trim() ? 'pointer' : 'not-allowed',
              background: terminalInput.trim() ? 'rgba(6,182,212,0.15)' : 'transparent',
              border: `1px solid ${terminalInput.trim() ? 'rgba(6,182,212,0.4)' : 'transparent'}`,
              color: terminalInput.trim() ? '#06b6d4' : 'var(--text-dim)',
              fontSize: 9, fontFamily: 'var(--font-system)', fontWeight: 700, letterSpacing: '0.1em',
              transition: 'all 0.18s',
            }}
          >
            <Send size={11} />
            SEND
          </button>

          {/* Histórico de logs */}
          {logs.length > 0 && (
            <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', flexShrink: 0 }}>
              {logs.length} LOG{logs.length > 1 ? 'S' : ''}
            </div>
          )}
        </div>

        {/* PAINEL DIREITO — análise animada */}
        <AnimatePresence>
          {selectedGroup && (
            <AnalysisPanel
              group={selectedGroup}
              analysis={analysis}
              onClose={() => setSelectedGroup(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modal de setup do Supabase */}
      <AnimatePresence>
        {showSetup && (
          <SupabaseSetupModal
            onClose={() => setShowSetup(false)}
            onSave={() => setSupabaseReady(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
