import React, { useState } from 'react';
import './styles/global.css';
import { useAppAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { TarefasPage } from './pages/TarefasPage';
import { HabitosPage } from './pages/HabitosPage';
import { ProjetosPage } from './pages/ProjetosPage';
import { LembretesPage } from './pages/LembretesPage';
import { FinancasPage } from './pages/FinancasPage';
import { AnalisesPage } from './pages/AnalisesPage';
import { MissoesPage } from './pages/MissoesPage';
import { LoginPage } from './pages/LoginPage';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchOverlay } from './components/SearchOverlay';
import { NotificationTray } from './components/NotificationTray';
import { LevelUpModal } from './components/LevelUpModal';
import { FocoWidget } from './components/FocoWidget';
import { BackgroundBeams, Spotlight, ScanlineOverlay } from './components/AceternityUI';

export default function App() {
  const { user, login, logout } = useAppAuth();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Auto-login: se há perfil salvo, entra direto sem mostrar login
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('orbis_hunter_profile');
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile?.nome) login(profile);
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const handleK = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleK);
    return () => window.removeEventListener("keydown", handleK);
  }, []);



  if (!user) {
    return (
      <div className="bg-noise">
        <LoginPage onLogin={login} />
      </div>
    );
  }

  const pages = {
    dashboard: DashboardPage,
    chat: ChatPage,
    missoes: MissoesPage,
    tarefas: TarefasPage,
    habitos: HabitosPage,
    projetos: ProjetosPage,
    lembretes: LembretesPage,
    financas: FinancasPage,
    analises: AnalisesPage,
  };
  const PageComponent = pages[page] || DashboardPage;

  return (
    <div className="bg-noise" style={{ display: "flex", minHeight: "100vh", position: "relative", background: "var(--bg)" }}>
      {/* Background premium — raios de luz animados */}
      <BackgroundBeams className="z-0 opacity-60" />
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="sidebar-desktop" style={{ position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50 }}>
        <Sidebar page={page} setPage={setPage} />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50 }}
          >
            <Sidebar page={page} setPage={setPage} onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, marginLeft: 260, display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative", zIndex: 1 }}>
        <Spotlight className="z-0" fill="rgba(0,217,255,0.07)" />
        <Header user={user} onLogout={() => { localStorage.removeItem('orbis_hunter_profile'); logout(); }} onMenuToggle={() => setSidebarOpen(true)} onSearchToggle={() => setSearchOpen(true)} />
        <main style={{ flex: 1, padding: 24, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 8, filter: "blur(2px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        setPage={setPage}
      />
      <NotificationTray />
      <LevelUpModal />
      <FocoWidget />
      <ScanlineOverlay />
    </div>
  );
}
