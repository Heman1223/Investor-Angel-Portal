import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
    '/': 'Portfolio Overview',
    '/portfolio': 'Startups',
    '/documents': 'Documents',
    '/alerts': 'Reports',
    '/settings': 'Settings',
};

export default function Header() {
    const { investor, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const pageTitle = PAGE_TITLES[location.pathname] || 'Portfolio';
    const isDashboard = location.pathname === '/';

    return (
        <header className="flex items-center justify-between px-6 lg:px-8 py-3 sticky top-0 z-10 border-b" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--color-border-light)',
        }}>
            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-50">
                    <Menu size={20} style={{ color: 'var(--color-text-primary)' }} />
                </button>
            </div>

            {/* Page Title */}
            <div className="hidden md:flex items-center gap-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {pageTitle}
                </h2>
                {isDashboard && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{
                        background: '#dcfce7',
                        color: '#16a34a',
                    }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        LIVE
                    </span>
                )}
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--color-text-muted)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search portfolio..."
                        className="w-full py-2 pl-10 pr-4 rounded-lg text-sm"
                        style={{
                            background: 'var(--color-bg-hover)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-light)',
                        }}
                    />
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <button
                    onClick={() => navigate('/alerts')}
                    className="relative p-2 rounded-lg transition-colors hover:bg-gray-50"
                >
                    <Bell size={18} style={{ color: 'var(--color-text-secondary)' }} strokeWidth={2} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{
                        background: '#ef4444',
                        border: '2px solid white',
                    }}></span>
                </button>

                {/* Divider */}
                <div className="h-6 w-px mx-1" style={{ background: 'var(--color-border-light)' }}></div>

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                                {investor?.name || 'Alex Morgan'}
                            </p>
                            <p className="text-[11px] leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                                Managing Partner
                            </p>
                        </div>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        }}>
                            <User size={15} color="white" strokeWidth={2.5} />
                        </div>
                        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </button>

                    {showUserMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                            <div
                                className="absolute right-0 mt-2 w-52 rounded-xl border overflow-hidden z-20"
                                style={{
                                    background: 'white',
                                    borderColor: 'var(--color-border)',
                                    boxShadow: 'var(--shadow-lg)',
                                }}
                            >
                                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {investor?.name || 'Alex Morgan'}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                        {investor?.email || 'alex@example.com'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    <LogOut size={15} strokeWidth={2} />
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
