import React from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div
                onClick={onClose}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
                className="animate-fade-in"
            />
            <div className="card animate-slide-up" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 500, padding: 32, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
