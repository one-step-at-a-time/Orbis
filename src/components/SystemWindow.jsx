import React from 'react';

export function SystemWindow({ title, children, style }) {
    return (
        <div style={{
            background: 'rgba(5, 8, 16, 0.92)',
            border: '1px solid rgba(6, 182, 212, 0.28)',
            borderRadius: 12,
            boxShadow: '0 0 20px rgba(6,182,212,0.12), inset 0 0 40px rgba(6,182,212,0.03)',
            overflow: 'hidden',
            ...style,
        }}>
            {title && (
                <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(6,182,212,0.18)',
                    background: 'rgba(6,182,212,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#06b6d4',
                        boxShadow: '0 0 8px #06b6d4',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 2,
                        color: '#06b6d4',
                        textTransform: 'uppercase',
                    }}>
                        {title}
                    </span>
                </div>
            )}
            <div style={{ padding: 16 }}>
                {children}
            </div>
        </div>
    );
}
