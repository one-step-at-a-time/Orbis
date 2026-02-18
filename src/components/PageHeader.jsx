import React from 'react';

export function PageHeader({ title, subtitle }) {
    return (
        <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#06b6d4',
                    boxShadow: '0 0 8px rgba(6,182,212,0.8)',
                    animation: 'system-pulse 2s ease-in-out infinite',
                    flexShrink: 0,
                }} />
                <h1 style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#06b6d4',
                    textShadow: '0 0 20px rgba(6,182,212,0.45)',
                }}>
                    [ {title} ]
                </h1>
            </div>
            {subtitle && (
                <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--text-dim)',
                    paddingLeft: 18,
                }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}
