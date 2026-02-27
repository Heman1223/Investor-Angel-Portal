import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
    const { investor, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 border-b" style={{ 
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--color-border-light)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
        }}>
            {/* Mobile Menu & Logo */}
            <div className="md:hidden flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Menu size={20} style={{ color: 'var(--color-text-primary)' }} strokeWidth={2} />
                </button>
                <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    AngelFlow
                </span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md">
                <div className="relative w-full">
                    <Search 
                        size={18} 
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--color-text-muted)' }}
                        strokeWidth={2}
                    />
                    <input
                        type="text"
                        placeholder="Search startups, sectors, or founders..."
                        className="w-full py-2.5 pl-11 pr-4 rounded-lg text-sm border transition-all focus:ring-2 focus:ring-green-100"
                        style={{ 
                            background: 'var(--color-bg-hover)',
                            color: 'var(--color-text-primary)',
                            border: '1.5px solid var(--color-border-light)',
                            boxShadow: 'var(--shadow-xs)'
                        }}
                    />
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative p-2.5 rounded-lg transition-all hover:bg-gray-50" style={{
                    border: '1px solid var(--color-border-light)'
                }}>
                    <Bell size={18} style={{ color: 'var(--color-text-secondary)' }} strokeWidth={2} />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 animate-pulse" style={{ 
                        background: '#ef4444',
                        borderColor: 'white'
                    }}></span>
                </button>

                {/* Divider */}
                <div className="h-6 w-[1px]" style={{ background: 'var(--color-border-light)' }}></div>

                {/* User Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-gray-50"
                        style={{ border: '1px solid var(--color-border-light)' }}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                                {investor?.name || 'Arjun Mehta'}
                            </p>
                            <p className="text-xs leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
                                Managing Partner
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center overflow-hidden" style={{ 
                            background: 'linear-gradient(135deg, #14b830 0%, #0e8a23 100%)',
                            boxShadow: '0 2px 8px rgba(20, 184, 48, 0.25)'
                        }}>
                            <User size={16} color="white" strokeWidth={2.5} />
                        </div>
                        <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} strokeWidth={2} />
                    </button>

                    {/* Dropdown */}
                    {showUserMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-10"
                                onClick={() => setShowUserMenu(false)}
                            />
                            <div 
                                className="absolute right-0 mt-2 w-56 rounded-xl border overflow-hidden z-20"
                                style={{ 
                                    background: 'white',
                                    borderColor: 'var(--color-border-light)',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                            >
                                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {investor?.name || 'Arjun Mehta'}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                        {investor?.email || 'arjun@example.com'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    <LogOut size={16} strokeWidth={2} />
                                    Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
