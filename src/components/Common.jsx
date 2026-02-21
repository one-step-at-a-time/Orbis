import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CornerBrackets, Spotlight } from './AceternityUI';
import { cn } from '../utils/formatters';

// SpotlightCard — Intel Panel com spotlight no cursor e corner brackets
export function SpotlightCard({ children, style, className = '' }) {
    const cardRef = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0, visible: false });

    const handleMouseMove = (e) => {
        const rect = cardRef.current.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
    };

    return (
        <motion.div
            ref={cardRef}
            className={cn("card", className)}
            style={{ position: 'relative', overflow: 'hidden', ...style }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setPos(p => ({ ...p, visible: false }))}
            whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
        >
            {/* Spotlight cursor */}
            {pos.visible && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
                    background: `radial-gradient(380px circle at ${pos.x}px ${pos.y}px, rgba(0,217,255,0.09), transparent 65%)`,
                }} />
            )}
            {/* Hover scan line */}
            {pos.visible && (
                <div style={{
                    position: 'absolute', left: 0, right: 0, pointerEvents: 'none',
                    top: pos.y - 1, height: 1,
                    background: `linear-gradient(90deg, transparent, rgba(0,217,255,0.25) ${Math.round((pos.x / (cardRef.current?.offsetWidth || 1)) * 100)}%, transparent)`,
                    opacity: 0.5,
                }} />
            )}
            {children}
        </motion.div>
    );
}

// StatsCard — Painel de Inteligência (Intel Panel)
export function StatsCard({ title, value, subtitle, icon: Icon, iconColor, bgColor }) {
    return (
        <SpotlightCard className="animate-hud-boot" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: 'relative', zIndex: 1 }}>
                <div>
                    {/* System label */}
                    <p style={{
                        fontSize: 9, fontFamily: "var(--font-system)", letterSpacing: "0.16em",
                        textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 8,
                    }}>
                        ▸ {title}
                    </p>
                    <h3 className="stat-number" style={{ fontSize: 30, color: "var(--text)", lineHeight: 1 }}>{value}</h3>
                    {subtitle && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-interface)" }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                <div style={{
                    padding: 10, borderRadius: 8,
                    background: bgColor || `rgba(0,217,255,0.06)`,
                    border: `1px solid ${iconColor || '#00d9ff'}20`,
                    boxShadow: `0 0 20px ${iconColor || '#00d9ff'}10`,
                }}>
                    <Icon size={20} color={iconColor || "var(--primary)"} />
                </div>
            </div>
        </SpotlightCard>
    );
}

// ProgressBar com energia visual
export function ProgressBar({ value, height, color }) {
    const c = color || 'var(--primary)';
    return (
        <div className="progress-bar" style={height ? { height } : {}}>
            <div
                className="progress-fill"
                style={{
                    width: `${Math.min(Math.max(value, 0), 100)}%`,
                    ...(color && { background: `linear-gradient(90deg, ${c}, ${c}99)`, boxShadow: `0 0 8px ${c}80` }),
                }}
            />
        </div>
    );
}

// Badge — Threat Indicator
export function Badge({ children, color, bg }) {
    return (
        <span className="badge" style={{
            color, background: bg,
            border: `1px solid ${color}33`,
            boxShadow: `0 0 10px ${color}18`,
        }}>
            {children}
        </span>
    );
}
