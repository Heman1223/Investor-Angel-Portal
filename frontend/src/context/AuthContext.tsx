import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

interface Investor {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionTier: string;
}

interface AuthContextType {
    investor: Investor | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [investor, setInvestor] = useState<Investor | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('accessToken');
            if (!token) {
                // Try refresh
                const refreshRes = await authAPI.refresh();
                sessionStorage.setItem('accessToken', refreshRes.data.data.accessToken);
            }
            const res = await authAPI.me();
            setInvestor(res.data.data);
        } catch {
            setInvestor(null);
            sessionStorage.removeItem('accessToken');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email: string, password: string) => {
        const res = await authAPI.login(email, password);
        sessionStorage.setItem('accessToken', res.data.data.accessToken);
        setInvestor(res.data.data.investor);
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } finally {
            sessionStorage.removeItem('accessToken');
            setInvestor(null);
        }
    };

    return (
        <AuthContext.Provider value={{ investor, isLoading, isAuthenticated: !!investor, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
