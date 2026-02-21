import React, { useState } from 'react';
import { LogOut, Sun, Moon, Menu, Search, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { HunterProfileModal } from './HunterProfileModal';

export function Header({ user, onLogout, onMenuToggle, onSearchToggle }) {
    const { theme, toggleTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <>
            <header className="blur-header" style={{ height: 72, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 40, background: "rgba(11,11,26,0.85)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onMenuToggle} className="btn-ghost sidebar-toggle" style={{ display: "none" }}>
                        <Menu size={20} />
                    </button>
                    <button onClick={onSearchToggle} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: "rgba(17,24,39,0.4)" }}>
                        <Search size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: 13, color: "var(--text-muted)", display: "none" }} className="header-search-text">Search archives...</span>
                        <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(59,89,255,0.08)", color: "var(--primary)", border: "1px solid var(--border)" }}>⌘K</kbd>
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={toggleTheme} className="btn-ghost" style={{ padding: 10, borderRadius: 12 }}>
                        {theme === 'dark' ? <Sun size={20} color="var(--primary)" /> : <Moon size={20} color="var(--primary)" />}
                    </button>

                    <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

                    {/* Hunter profile button */}
                    <button
                        onClick={() => setProfileOpen(true)}
                        className="btn-ghost"
                        style={{ padding: "8px 12px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}
                        title="Perfil do Caçador"
                    >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59, 89, 255, 0.1)", border: "1px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={14} color="var(--primary)" />
                        </div>
                        {user?.nome && (
                            <span style={{ fontSize: 12, fontFamily: "var(--font-system)", color: "var(--primary)", fontWeight: 700 }} className="header-search-text">
                                {user.nome}
                            </span>
                        )}
                    </button>

                    <button onClick={onLogout} className="btn-ghost" style={{ padding: 10, borderRadius: 12 }} title="Sair do Sistema">
                        <LogOut size={20} color="#ef4444" />
                    </button>
                </div>
            </header>

            {profileOpen && <HunterProfileModal onClose={() => setProfileOpen(false)} />}
        </>
    );
}
