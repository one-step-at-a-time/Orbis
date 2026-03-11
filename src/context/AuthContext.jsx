import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getSession,
    onAuthChange,
    signOut as sbSignOut,
    fetchProfile,
} from '../services/supabaseService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // undefined = ainda carregando; null = sem sessão; objeto = sessão ativa
    const [session, setSession] = useState(undefined);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Inicializa sessão e escuta mudanças
    useEffect(() => {
        getSession().then(({ data }) => setSession(data.session ?? null));
        const { data: { subscription } } = onAuthChange(setSession);
        return () => subscription.unsubscribe();
    }, []);

    // Quando a sessão muda, carrega o perfil
    useEffect(() => {
        if (!session) {
            setProfile(null);
            return;
        }

        // 1. Tenta localStorage primeiro (instantâneo)
        try {
            const raw = localStorage.getItem('orbis_hunter_profile');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.nome) { setProfile(parsed); return; }
            }
        } catch { /* ignora */ }

        // 2. Tenta buscar do Supabase (novo dispositivo / sem localStorage)
        setProfileLoading(true);
        fetchProfile(session.user.id)
            .then(p => {
                if (p?.nome) {
                    localStorage.setItem('orbis_hunter_profile', JSON.stringify(p));
                    setProfile(p);
                }
                // Se null → perfil não existe → ProfileSetupPage será exibida
            })
            .catch(() => { /* ignora — ProfileSetupPage lida com isso */ })
            .finally(() => setProfileLoading(false));
    }, [session]);

    const saveProfile = (p) => {
        localStorage.setItem('orbis_hunter_profile', JSON.stringify(p));
        setProfile(p);
    };

    const logout = async () => {
        localStorage.removeItem('orbis_hunter_profile');
        setProfile(null);
        await sbSignOut();
    };

    return (
        <AuthContext.Provider value={{
            session,
            profile,
            saveProfile,
            logout,
            loading: session === undefined || profileLoading,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAppAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAppAuth must be used within AuthProvider');
    return ctx;
}
