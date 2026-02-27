import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            toast.error(err.response?.data?.error?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#f4f6f5' }}>
            {/* Header */}
            <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b" style={{
                borderColor: '#e5e7eb',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
            }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                        background: '#22c55e',
                    }}>
                        <Building2 size={18} color="white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-base font-bold tracking-tight" style={{ color: '#0f172a' }}>
                        Investor Portal
                    </h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6">
                        <a href="#" className="text-sm font-medium transition-colors hover:text-green-600" style={{ color: '#64748b' }}>
                            Support
                        </a>
                        <a href="#" className="text-sm font-medium transition-colors hover:text-green-600" style={{ color: '#64748b' }}>
                            Contact
                        </a>
                    </div>
                    <button className="btn btn-primary btn-sm px-5">
                        Sign Up
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center px-4 py-12 lg:px-8">
                <div className="mx-auto w-full max-w-[460px] animate-fade-in">
                    {/* Login Card */}
                    <div className="rounded-2xl overflow-hidden" style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                    }}>
                        {/* Decorative Header Banner */}
                        <div
                            className="h-28 relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #1a3a2a 0%, #1e5a35 40%, #2d7a45 70%, #8b7435 100%)',
                            }}
                        >
                            <div className="absolute inset-0" style={{
                                background: 'radial-gradient(circle at 80% 20%, rgba(255,215,0,0.15) 0%, transparent 60%)',
                            }}></div>
                            <div className="absolute bottom-4 left-6">
                                <h3 className="text-white text-lg font-bold tracking-tight">Welcome Back</h3>
                                <p className="text-white/80 text-sm">Securely access your portfolio</p>
                            </div>
                        </div>

                        <div className="p-7 pt-6">
                            <div className="mb-7 text-center">
                                <h1 className="text-xl font-bold tracking-tight" style={{ color: '#0f172a' }}>
                                    Private Investment Intelligence
                                </h1>
                                <p className="mt-2 text-sm" style={{ color: '#22c55e' }}>
                                    Please sign in to continue to your dashboard
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input"
                                        placeholder="investor@example.com"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium" style={{ color: '#0f172a' }}>
                                            Password
                                        </label>
                                        <a href="#" className="text-xs font-semibold hover:underline" style={{ color: '#22c55e' }}>
                                            Forgot password?
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input pr-10"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-600 transition-colors"
                                            style={{ color: '#94a3b8' }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 text-sm font-bold rounded-xl transition-all duration-150"
                                    style={{
                                        background: '#22c55e',
                                        color: 'white',
                                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                        opacity: isLoading ? 0.7 : 1,
                                    }}
                                    onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#16a34a'; }}
                                    onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#22c55e'; }}
                                >
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>

                            <div className="mt-7 pt-5 border-t" style={{ borderColor: '#f1f5f9' }}>
                                <p className="text-center text-sm" style={{ color: '#64748b' }}>
                                    New to the platform?{' '}
                                    <a href="#" className="font-semibold hover:underline" style={{ color: '#22c55e' }}>
                                        Request access
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-6 flex justify-center gap-6 text-sm" style={{ color: '#94a3b8' }}>
                        <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
                        <span className="h-4 w-px" style={{ background: '#e2e8f0' }}></span>
                        <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
