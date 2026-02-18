import React from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div
                onClick={onClose}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
                className="animate-fade-in"
            />
            <div className="animate-slide-up" style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth: 500,
                padding: 32,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "rgba(5,8,16,0.95)",
                border: "1px solid rgba(6,182,212,0.3)",
                borderRadius: "var(--radius)",
                boxShadow: "0 0 40px rgba(6,182,212,0.15), 0 20px 60px rgba(0,0,0,0.6)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h2 style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#06b6d4",
                        textShadow: "0 0 12px rgba(6,182,212,0.4)",
                    }}>{title}</h2>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
