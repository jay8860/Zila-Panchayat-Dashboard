import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);

    // MVP: Hardcoded access code
    // In production, this would be an env var or real backend auth
    const ACCESS_CODE = "2025";

    useEffect(() => {
        // Check localStorage on mount
        const storedAuth = localStorage.getItem('zp_auth_token');
        if (storedAuth === ACCESS_CODE) {
            setIsAuthenticated(true);
        }
        setChecking(false);
    }, []);

    const login = (code) => {
        if (code === ACCESS_CODE) {
            localStorage.setItem('zp_auth_token', code);
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        localStorage.removeItem('zp_auth_token');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, checking }}>
            {children}
        </AuthContext.Provider>
    );
};
