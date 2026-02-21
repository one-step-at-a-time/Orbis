import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function PageHeader({ title, subtitle, moduleCode }) {
    const [scanned, setScanned] = useState(false);
    useEffect(() => { setScanned(false); const t = setTimeout(() => setScanned(true), 50); return () => clearTimeout(t); }, [title]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="scan-trigger"
            style={{ marginBottom: 12, position: "relative" }}
        >
            {/* Module identifier */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                {moduleCode && (
                    <span style={{
                        fontSize: 9, fontFamily: "var(--font-system)", letterSpacing: "0.2em",
                        color: "var(--text-dim)", padding: "2px 8px",
                        border: "1px solid rgba(0,217,255,0.15)", borderRadius: 3,
                    }}>
                        {moduleCode}
                    </span>
                )}

                {/* Live indicator */}
                <span style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: "var(--primary)",
                    boxShadow: "0 0 12px rgba(0,217,255,1), 0 0 24px rgba(0,217,255,0.4)",
                    animation: "system-pulse 2s ease-in-out infinite",
                }} />

                <h1 style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    textShadow: "0 0 28px rgba(0,217,255,0.65), 0 0 56px rgba(0,217,255,0.2)",
                }}>
                    [ {title} ]
                </h1>
            </div>

            {/* Subtitle */}
            {subtitle && (
                <p style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--text-dim)",
                    paddingLeft: moduleCode ? 72 : 24,
                    textTransform: "uppercase",
                }}>
                    ▸ {subtitle}
                </p>
            )}

            {/* Energy line */}
            <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                style={{
                    height: 1, marginTop: 14,
                    background: "linear-gradient(90deg, var(--primary), rgba(124,58,237,0.5), transparent)",
                    transformOrigin: "left",
                }}
            />
        </motion.div>
    );
}
