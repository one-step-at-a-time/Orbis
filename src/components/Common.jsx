import React, { useRef, useState } from 'react';

export function SpotlightCard({ children, style, className = '' }) {
    const cardRef = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0, visible: false });

    const handleMouseMove = (e) => {
        const rect = cardRef.current.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
    };

    return (
        <div
            ref={cardRef}
            className={`card ${className}`}
            style={{ position: 'relative', overflow: 'hidden', ...style }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setPos(p => ({ ...p, visible: false }))}
        >
            {pos.visible && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
                    background: `radial-gradient(350px circle at ${pos.x}px ${pos.y}px, rgba(6,182,212,0.10), transparent 65%)`,
                }} />
            )}
            {children}
        </div>
    );
}

export function StatsCard({ title, value, subtitle, icon: Icon, iconColor, bgColor }) {
    return (
        <SpotlightCard className="animate-slide-up" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: 'relative', zIndex: 1 }}>
                <div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{title}</p>
                    <h3 className="stat-number" style={{ fontSize: 32, color: "var(--text)" }}>{value}</h3>
                    {subtitle && <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{subtitle}</p>}
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: bgColor || "var(--bg-secondary)" }}>
                    <Icon size={22} color={iconColor || "var(--primary)"} />
                </div>
            </div>
        </SpotlightCard>
    );
}

export function ProgressBar({ value, height }) {
    return (
        <div className="progress-bar" style={height ? { height } : {}}>
            <div className="progress-fill" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
        </div>
    );
}

export function Badge({ children, color, bg }) {
    return (
        <span className="badge" style={{ color, background: bg, border: `1px solid ${color}22` }}>
            {children}
        </span>
    );
}
