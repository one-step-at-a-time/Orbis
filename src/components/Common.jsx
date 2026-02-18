import React from 'react';

export function StatsCard({ title, value, subtitle, icon: Icon, iconColor, bgColor }) {
    return (
        <div className="card animate-slide-up" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{title}</p>
                    <h3 className="stat-number" style={{ fontSize: 32, color: "var(--text)" }}>{value}</h3>
                    {subtitle && <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{subtitle}</p>}
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: bgColor || "var(--bg-secondary)" }}>
                    <Icon size={22} color={iconColor || "var(--primary)"} />
                </div>
            </div>
        </div>
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
