import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState('viewer'); // 'admin' | 'viewer'
    const [checking, setChecking] = useState(true);

    // MVP: Hardcoded access code
    const ADMIN_CODE = "2025";
    const VIEWER_CODE = "1234";

    useEffect(() => {
        // Check localStorage on mount
        const storedAuth = localStorage.getItem('zp_auth_token');
        const storedRole = localStorage.getItem('zp_user_role');

        if (storedAuth) {
            setIsAuthenticated(true);
            setUserRole(storedRole || 'viewer');
        }
        setChecking(false);
    }, []);

    const login = (code) => {
        if (code === ADMIN_CODE) {
            localStorage.setItem('zp_auth_token', 'valid');
            localStorage.setItem('zp_user_role', 'admin');
            setIsAuthenticated(true);
            setUserRole('admin');
            return true;
        }
        if (code === VIEWER_CODE) {
            localStorage.setItem('zp_auth_token', 'valid');
            localStorage.setItem('zp_user_role', 'viewer');
            setIsAuthenticated(true);
            setUserRole('viewer');
            return true;
        }
        return false;
    };

    const logout = () => {
        localStorage.removeItem('zp_auth_token');
        localStorage.removeItem('zp_user_role');
        setIsAuthenticated(false);
        setUserRole('viewer'); // reset to safe default
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout, checking }}>
            {children}
        </AuthContext.Provider>
    );
};
