import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

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

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 60 * 1000; // Show warning 1 minute before logout

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [investor, setInvestor] = useState<Investor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningShownRef = useRef(false);

    const performLogout = useCallback(async () => {
        try {
            await authAPI.logout();
        } finally {
            sessionStorage.removeItem('accessToken');
            setInvestor(null);
        }
    }, []);

    const clearInactivityTimers = useCallback(() => {
        if (logoutTimerRef.current) { clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null; }
        if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
        warningShownRef.current = false;
    }, []);

    const resetInactivityTimer = useCallback(() => {
        clearInactivityTimers();

        // Warning timer — 1 minute before logout
        warningTimerRef.current = setTimeout(() => {
            if (!warningShownRef.current) {
                warningShownRef.current = true;
                toast('You will be logged out in 1 minute due to inactivity.', {
                    icon: '⏱️',
                    duration: 10000,
                    style: {
                        background: 'rgba(15,24,41,0.95)',
                        color: '#EDE5CC',
                        border: '1px solid rgba(197,164,84,0.3)',
                    },
                });
            }
        }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

        // Logout timer
        logoutTimerRef.current = setTimeout(async () => {
            toast('Session expired due to inactivity. Please log in again.', {
                icon: '🔒',
                duration: 5000,
            });
            await performLogout();
        }, INACTIVITY_TIMEOUT);
    }, [clearInactivityTimers, performLogout]);

    // Set up activity listeners when user is authenticated
    useEffect(() => {
        if (!investor) {
            clearInactivityTimers();
            return;
        }

        const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        const handleActivity = () => {
            if (warningShownRef.current) {
                warningShownRef.current = false;
                toast.dismiss(); // Dismiss the warning toast
            }
            resetInactivityTimer();
        };

        // Throttle activity handler to avoid excessive timer resets
        let throttleTimer: ReturnType<typeof setTimeout> | null = null;
        const throttledHandler = () => {
            if (throttleTimer) return;
            handleActivity();
            throttleTimer = setTimeout(() => { throttleTimer = null; }, 1000);
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, throttledHandler, { passive: true });
        });

        // Start the initial timer
        resetInactivityTimer();

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, throttledHandler);
            });
            clearInactivityTimers();
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [investor, resetInactivityTimer, clearInactivityTimers]);

    const checkAuthCalledRef = useRef(false);

    const checkAuth = useCallback(async () => {
        if (checkAuthCalledRef.current) return;
        checkAuthCalledRef.current = true;
        
        try {
            console.log('[Auth] Checking session...');
            const token = sessionStorage.getItem('accessToken');
            if (!token) {
                console.log('[Auth] No token found, trying refresh...');
                const refreshRes = await authAPI.refresh();
                if (refreshRes.data?.data?.accessToken) {
                    console.log('[Auth] Refresh successful');
                    sessionStorage.setItem('accessToken', refreshRes.data.data.accessToken);
                }
            }
            const res = await authAPI.me();
            console.log('[Auth] User verified:', res.data.data?.email);
            setInvestor(res.data.data);
        } catch (err: any) {
            console.error('[Auth] Verification failed:', err.message);
            setInvestor(null);
            sessionStorage.removeItem('accessToken');
        } finally {
            console.log('[Auth] Loading cleared');
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
        clearInactivityTimers();
        await performLogout();
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
