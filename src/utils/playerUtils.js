export function getRank(level) {
    if (level >= 71) return { rank: 'Nacional', color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' };
    if (level >= 51) return { rank: 'S',        color: '#ef4444', glow: 'rgba(239,68,68,0.5)' };
    if (level >= 36) return { rank: 'A',        color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' };
    if (level >= 21) return { rank: 'B',        color: '#a855f7', glow: 'rgba(168,85,247,0.5)' };
    if (level >= 11) return { rank: 'C',        color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' };
    if (level >= 6)  return { rank: 'D',        color: '#22c55e', glow: 'rgba(34,197,94,0.5)' };
    return              { rank: 'E',        color: '#9ca3af', glow: 'rgba(156,163,175,0.5)' };
}
