import { LogOut, Sun, Moon, Menu, Bell, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Header({ user, onLogout, onMenuToggle, onSearchToggle }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="blur-header" style={{ height: 72, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(6,182,212,0.15)", position: "sticky", top: 0, zIndex: 40, background: "rgba(5,8,16,0.88)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={onMenuToggle} className="btn-ghost sidebar-toggle" style={{ display: "none" }}>
                    <Menu size={20} />
                </button>
                <button onClick={onSearchToggle} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: "rgba(17,24,39,0.4)" }}>
                    <Search size={18} color="var(--text-dim)" />
                    <span style={{ fontSize: 13, color: "var(--text-dim)", display: "none" }} className="header-search-text">Buscar...</span>
                    <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(6,182,212,0.06)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>⌘K</kbd>
                </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={toggleTheme} className="btn-ghost" style={{ padding: 10, borderRadius: 12 }}>
                    {theme === 'dark' ? <Sun size={20} color="var(--primary)" /> : <Moon size={20} color="var(--primary)" />}
                </button>

                <button className="btn-ghost" style={{ padding: 10, borderRadius: 12, position: "relative" }}>
                    <Bell size={20} color="var(--text-muted)" />
                    <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "2px solid #0a0b0e" }} />
                </button>

                <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 8px" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right", display: "none" }} className="header-user-info">
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{user?.nome}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Plano Premium</p>
                    </div>
                    <button onClick={onLogout} className="btn-ghost" style={{ padding: 10, borderRadius: 12 }}>
                        <LogOut size={20} color="#ef4444" />
                    </button>
                </div>
            </div>
        </header>
    );
}
