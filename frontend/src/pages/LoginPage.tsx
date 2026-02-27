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
        <div className="min-h-screen flex flex-col" style={{ background: '#f6f8f6' }}>
            {/* Header */}
            <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b" style={{ 
                borderColor: '#e5e7eb',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)'
            }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
                        background: 'rgba(20, 184, 48, 0.1)',
                        color: '#14b830'
                    }}>
                        <Building2 size={20} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight" style={{ color: '#111812' }}>
                        Investor Portal
                    </h2>
                </div>
                <div className="flex items-center gap-4 lg:gap-8">
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
                <div className="mx-auto w-full max-w-[480px] animate-fade-in">
                    {/* Login Card */}
                    <div className="rounded-2xl overflow-hidden" style={{ 
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
                    }}>
                        {/* Decorative Header with Image */}
                        <div 
                            className="h-32 bg-cover bg-center relative"
                            style={{
                                backgroundImage: 'linear-gradient(135deg, #1a5a2a 0%, #14b830 50%, #c9a84c 100%)',
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-4 left-6">
                                <h3 className="text-white text-xl font-bold tracking-tight">Welcome Back</h3>
                                <p className="text-white/90 text-sm">Securely access your portfolio</p>
                            </div>
                        </div>

                        <div className="p-8 pt-6">
                            <div className="mb-8 text-center">
                                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111812' }}>
                                    Private Investment Intelligence
                                </h1>
                                <p className="mt-2 text-sm" style={{ color: '#64748b' }}>
                                    Please sign in to continue to your dashboard
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#111812' }}>
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
                                        style={{ background: '#f9fafb' }}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium" style={{ color: '#111812' }}>
                                            Password
                                        </label>
                                        <a href="#" className="text-xs font-medium hover:underline" style={{ color: '#14b830' }}>
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
                                            style={{ background: '#f9fafb' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-700"
                                            style={{ color: '#94a3b8' }}
                                        >
                                            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 text-sm font-bold rounded-xl transition-all"
                                    style={{ 
                                        background: '#14b830',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(20, 184, 48, 0.3)',
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                >
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t" style={{ borderColor: '#f0f0f0' }}>
                                <p className="text-center text-sm" style={{ color: '#64748b' }}>
                                    New to the platform?{' '}
                                    <a href="#" className="font-semibold hover:underline" style={{ color: '#14b830' }}>
                                        Request access
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-8 flex justify-center gap-6 text-sm" style={{ color: '#64748b' }}>
                        <a href="#" className="hover:text-gray-800 transition-colors">Privacy Policy</a>
                        <span className="h-4 w-px" style={{ background: '#e5e7eb' }}></span>
                        <a href="#" className="hover:text-gray-800 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
