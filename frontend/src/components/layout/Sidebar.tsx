import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Rocket, FileText, Settings, Lightbulb, Bell } from 'lucide-react';

export default function Sidebar() {
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/portfolio', icon: Rocket, label: 'Startups' },
        { to: '/alerts', icon: Bell, label: 'Alerts' },
        { to: '/documents', icon: FileText, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="hidden md:flex w-64 flex-col justify-between h-full p-4" style={{ 
            background: 'white',
            borderRight: '1px solid var(--color-border-light)',
            boxShadow: 'inset -1px 0 0 0 rgba(0, 0, 0, 0.02)'
        }}>
            <div className="flex flex-col gap-8">
                {/* Logo */}
                <div className="flex items-center gap-3 px-2 pt-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ 
                        background: 'linear-gradient(135deg, #14b830 0%, #0e8a23 100%)',
                        boxShadow: '0 2px 8px rgba(20, 184, 48, 0.25)'
                    }}>
                        <Rocket size={20} color="white" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            AngelFlow
                        </h1>
                        <p className="text-xs font-semibold" style={{ color: '#14b830' }}>
                            Investor Portal
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: isActive ? '600' : '500',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: isActive 
                                    ? 'linear-gradient(135deg, rgba(20, 184, 48, 0.1) 0%, rgba(20, 184, 48, 0.05) 100%)' 
                                    : 'transparent',
                                color: isActive ? '#14b830' : 'var(--color-text-secondary)',
                                border: isActive ? '1px solid rgba(20, 184, 48, 0.2)' : '1px solid transparent',
                                boxShadow: isActive ? '0 1px 3px rgba(20, 184, 48, 0.1)' : 'none'
                            })}
                            className="hover:bg-gray-50"
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Pro Tip Card */}
            <div className="p-3.5 rounded-xl border" style={{ 
                background: 'linear-gradient(135deg, #f0f9f1 0%, #e8f5e9 100%)',
                borderColor: 'rgba(20, 184, 48, 0.15)'
            }}>
                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ 
                        background: 'rgba(20, 184, 48, 0.15)',
                        boxShadow: '0 1px 3px rgba(20, 184, 48, 0.1)'
                    }}>
                        <Lightbulb size={16} style={{ color: '#14b830' }} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                            Pro Tip
                        </p>
                        <p className="text-[10px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                            Update valuations quarterly.
                        </p>
                    </div>
                </div>
                <button className="w-full py-1.5 text-xs font-semibold rounded-lg border transition-all hover:shadow-sm" style={{ 
                    color: '#14b830',
                    background: 'white',
                    borderColor: 'rgba(20, 184, 48, 0.2)'
                }}>
                    Learn more
                </button>
            </div>
        </div>
    );
}
