import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Music, X, Play, Pause, RotateCcw, Volume2, ChevronDown } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const MODES = {
  foco:  { label: 'Foco',        duration: 25 * 60, color: '#06b6d4' },
  pausa: { label: 'Pausa',       duration: 5  * 60, color: '#22c55e' },
  longa: { label: 'Pausa Longa', duration: 15 * 60, color: '#8b5cf6' },
};

const CHANNELS = [
  { id: 'jfKfPfyJRdk', label: 'Lofi Girl' },
  { id: '5qap5aO4i9A', label: 'Chilled Beats' },
  { id: 'lTRiuFIWV54', label: 'Study Beats' },
  { id: 'HuFYqnbVbzY', label: 'Jazz Lofi' },
];

const CIRCUMFERENCE = 2 * Math.PI * 54;

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch (_) {}
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function FocoWidget() {
  const { gainXPAmount } = usePlayer();

  // Widget open/close
  const [isOpen, setIsOpen] = useState(false);

  // Pomodoro
  const [mode, setMode] = useState('foco');
  const [timeLeft, setTimeLeft] = useState(MODES.foco.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);
  const modeRef = useRef(mode);

  // Player
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [channelIdx, setChannelIdx] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const ytPlayerRef = useRef(null);

  const totalDuration = MODES[mode].duration;
  const progress = (totalDuration - timeLeft) / totalDuration;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const modeColor = MODES[mode].color;

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            playBeep();
            if (modeRef.current === 'foco') {
              setSessions(s => s + 1);
              gainXPAmount(50);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, gainXPAmount]);

  const handleModeChange = (newMode) => {
    clearInterval(intervalRef.current);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
    setIsRunning(false);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setTimeLeft(MODES[mode].duration);
    setIsRunning(false);
  };

  // YouTube IFrame API
  useEffect(() => {
    const initPlayer = () => {
      if (ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player('foco-yt-player', {
        height: '1',
        width: '1',
        videoId: CHANNELS[0].id,
        playerVars: { autoplay: 0, controls: 0, rel: 0 },
        events: {
          onReady: (e) => {
            setYtReady(true);
            e.target.setVolume(50);
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!ytReady || !ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  };

  const handleChannelChange = (idx) => {
    setChannelIdx(idx);
    setShowChannels(false);
    if (ytReady && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.loadVideoById(CHANNELS[idx].id);
      } else {
        ytPlayerRef.current.cueVideoById(CHANNELS[idx].id);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (ytReady && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(val);
    }
  };

  const sessionDots = Array.from({ length: 4 }, (_, i) => i < (sessions % 4 || (sessions > 0 && sessions % 4 === 0 ? 4 : 0)));

  return (
    <>
      {/* Hidden YouTube player mount point */}
      <div style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none', bottom: 0, right: 0, zIndex: -1 }}>
        <div id="foco-yt-player" />
      </div>

      {/* Floating Widget */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* --- COLLAPSED BUTTON --- */
            <motion.button
              key="collapsed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={() => setIsOpen(true)}
              title="Foco Total"
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--bg-card)',
                border: `2px solid ${isRunning ? modeColor : 'var(--border)'}`,
                color: isRunning ? modeColor : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2,
                boxShadow: isRunning
                  ? `0 0 24px ${modeColor}55, 0 4px 20px rgba(0,0,0,0.4)`
                  : '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'border-color 0.3s, box-shadow 0.3s, color 0.3s',
              }}
            >
              <Timer size={18} />
              {isRunning && (
                <span style={{
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </motion.button>
          ) : (
            /* --- EXPANDED PANEL --- */
            <motion.div
              key="expanded"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                width: 340,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.08)',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'rgba(6,182,212,0.04)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Timer size={15} color="var(--primary)" />
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    color: 'var(--primary)', fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    Foco Total
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Pomodoro ── */}
              <div style={{ padding: '20px 18px 16px' }}>
                {/* Mode tabs */}
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 22,
                  background: 'var(--bg)', borderRadius: 10, padding: 4,
                }}>
                  {Object.entries(MODES).map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => handleModeChange(key)}
                      style={{
                        flex: 1, padding: '6px 0', border: 'none', borderRadius: 7,
                        cursor: 'pointer',
                        background: mode === key ? m.color : 'transparent',
                        color: mode === key ? '#fff' : 'var(--text-muted)',
                        fontSize: 11, fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: mode === key ? `0 2px 10px ${m.color}44` : 'none',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* SVG Ring + countdown */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ position: 'relative', width: 160, height: 160 }}>
                    <svg width="160" height="160" viewBox="0 0 120 120"
                      style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background track */}
                      <circle cx="60" cy="60" r="54"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8" />
                      {/* Progress arc */}
                      <circle cx="60" cy="60" r="54"
                        fill="none"
                        stroke={modeColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                      />
                    </svg>
                    {/* Time + label */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 30, fontWeight: 700, lineHeight: 1,
                        color: isRunning ? modeColor : 'var(--text)',
                        transition: 'color 0.3s',
                      }}>
                        {formatTime(timeLeft)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {MODES[mode].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button
                    onClick={handleReset}
                    title="Reiniciar"
                    style={{
                      padding: '0 14px', height: 42, border: '1px solid var(--border)',
                      borderRadius: 10, background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => setIsRunning(r => !r)}
                    style={{
                      flex: 1, height: 42, border: 'none', borderRadius: 10,
                      cursor: 'pointer', background: modeColor, color: '#fff',
                      fontWeight: 700, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      boxShadow: `0 4px 18px ${modeColor}44`,
                      transition: 'background 0.3s, box-shadow 0.3s',
                    }}
                  >
                    {isRunning ? <Pause size={15} /> : <Play size={15} />}
                    {isRunning ? 'Pausar' : 'Iniciar'}
                  </button>
                </div>

                {/* Session dots */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sessão:</span>
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < (sessions % 4) ? '#06b6d4' : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 2 }}>
                    {sessions} completadas
                  </span>
                </div>
              </div>

              {/* ── Divider ── */}
              <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />

              {/* ── Lofi Player ── */}
              <div style={{ padding: '14px 18px 18px' }}>
                {/* Section title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Music size={13} color="var(--primary)" />
                  <span style={{
                    fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--primary)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    Lofi Player
                  </span>
                  {!ytReady && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      carregando...
                    </span>
                  )}
                </div>

                {/* Channel selector */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <button
                    onClick={() => setShowChannels(s => !s)}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 9, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      color: 'var(--text)', fontSize: 13,
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isPlaying ? '#22c55e' : 'rgba(255,255,255,0.15)',
                        boxShadow: isPlaying ? '0 0 8px #22c55e' : 'none',
                        transition: 'all 0.3s',
                      }} />
                      <span>{CHANNELS[channelIdx].label}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      color="var(--text-muted)"
                      style={{
                        transform: showChannels ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {showChannels && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute', top: 'calc(100% + 4px)',
                          left: 0, right: 0, zIndex: 10,
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 9, overflow: 'hidden',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}
                      >
                        {CHANNELS.map((ch, i) => (
                          <button
                            key={ch.id}
                            onClick={() => handleChannelChange(i)}
                            style={{
                              width: '100%', padding: '10px 14px',
                              background: i === channelIdx ? 'rgba(6,182,212,0.1)' : 'transparent',
                              border: 'none',
                              borderBottom: i < CHANNELS.length - 1 ? '1px solid var(--border)' : 'none',
                              color: i === channelIdx ? 'var(--primary)' : 'var(--text)',
                              cursor: 'pointer', textAlign: 'left', fontSize: 13,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { if (i !== channelIdx) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            onMouseLeave={e => { if (i !== channelIdx) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Play/Pause + Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handlePlayPause}
                    disabled={!ytReady}
                    title={isPlaying ? 'Pausar' : 'Tocar'}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: isPlaying ? '#22c55e22' : 'var(--bg)',
                      border: `1.5px solid ${isPlaying ? '#22c55e' : 'var(--border)'}`,
                      color: isPlaying ? '#22c55e' : 'var(--text)',
                      cursor: ytReady ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.25s',
                      boxShadow: isPlaying ? '0 4px 16px rgba(34,197,94,0.35)' : 'none',
                      opacity: ytReady ? 1 : 0.5,
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Volume2 size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <input
                      type="range" min="0" max="100" value={volume}
                      onChange={handleVolumeChange}
                      style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer', height: 4 }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 26, textAlign: 'right' }}>
                      {volume}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
