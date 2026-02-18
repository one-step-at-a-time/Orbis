import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = (userData) => setUser(userData);
    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAppAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAppAuth must be used within an AuthProvider');
    }
    return context;
}
