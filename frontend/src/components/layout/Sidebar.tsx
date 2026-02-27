import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Rocket, FileText, Settings, FolderOpen, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/portfolio', icon: Rocket, label: 'Startups' },
    { to: '/documents', icon: FolderOpen, label: 'Documents' },
    { to: '/alerts', icon: FileText, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const { investor } = useAuth();

    return (
        <aside className="hidden md:flex w-[240px] flex-col h-full flex-shrink-0" style={{
            background: 'var(--color-sidebar-bg)',
        }}>
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
                    background: 'var(--color-primary)',
                }}>
                    <Rocket size={18} color="white" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white leading-tight tracking-tight">
                        Angel Portfolio
                    </h1>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--color-sidebar-text)' }}>
                        {investor?.role === 'admin' ? 'ADMIN' : 'PRIVATE INVESTOR'}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className="group"
                    >
                        {({ isActive }) => (
                            <div
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                                style={{
                                    background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                                    color: isActive ? '#fff' : 'var(--color-sidebar-text)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'var(--color-sidebar-hover)';
                                        e.currentTarget.style.color = '#e2e8f0';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--color-sidebar-text)';
                                    }
                                }}
                            >
                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{item.label}</span>
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* New Investment CTA */}
            <div className="px-3 pb-6">
                <NavLink to="/portfolio">
                    <button
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                        style={{
                            background: 'var(--color-primary)',
                            color: 'white',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-primary-dark)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--color-primary)';
                        }}
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        New Investment
                    </button>
                </NavLink>
            </div>
        </aside>
    );
}
