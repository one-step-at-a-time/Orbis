import React, { useState } from 'react';
import { LogOut, Sun, Moon, Menu, Search, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { HunterProfileModal } from './HunterProfileModal';

export function Header({ user, onLogout, onMenuToggle, onSearchToggle }) {
    const { theme, toggleTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <>
            <header className="blur-header" style={{ height: 72, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,240,255,0.1)", position: "sticky", top: 0, zIndex: 40, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)", boxShadow: "0 1px 30px rgba(0,240,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onMenuToggle} className="btn-ghost sidebar-toggle" style={{ display: "none" }}>
                        <Menu size={20} />
                    </button>
                    <button onClick={onSearchToggle} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 0, clipPath: "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)", background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.1)" }}>
                        <Search size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "none", fontFamily: "var(--font-interface)", letterSpacing: "0.1em", textTransform: "uppercase" }} className="header-search-text">Search archives...</span>
                        <kbd style={{ fontSize: 9, padding: "2px 6px", borderRadius: 0, background: "rgba(0,240,255,0.08)", color: "var(--primary)", border: "1px solid rgba(0,240,255,0.2)", fontFamily: "var(--font-interface)", letterSpacing: "0.05em" }}>⌘K</kbd>
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={toggleTheme} className="btn-ghost" style={{ padding: 10, borderRadius: 0 }}>
                        {theme === 'dark' ? <Sun size={20} color="var(--primary)" /> : <Moon size={20} color="var(--primary)" />}
                    </button>

                    <div style={{ width: 1, height: 24, background: "rgba(0,240,255,0.15)", margin: "0 4px" }} />

                    {/* Hunter profile button */}
                    <button
                        onClick={() => setProfileOpen(true)}
                        className="btn-ghost"
                        style={{ padding: "8px 12px", borderRadius: 0, display: "flex", alignItems: "center", gap: 8 }}
                        title="Perfil do Caçador"
                    >
                        <div style={{ width: 28, height: 28, borderRadius: 0, clipPath: "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)", background: "rgba(0, 240, 255, 0.08)", border: "1px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(0,240,255,0.2)" }}>
                            <User size={14} color="var(--primary)" />
                        </div>
                        {user?.nome && (
                            <span style={{ fontSize: 11, fontFamily: "var(--font-interface)", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textShadow: "0 0 8px rgba(0,240,255,0.4)" }} className="header-search-text">
                                {user.nome}
                            </span>
                        )}
                    </button>

                    <button onClick={onLogout} className="btn-ghost" style={{ padding: 10, borderRadius: 0 }} title="Sair do Sistema">
                        <LogOut size={20} color="#FF2A4A" />
                    </button>
                </div>
            </header>

            {profileOpen && <HunterProfileModal onClose={() => setProfileOpen(false)} />}
        </>
    );
}
