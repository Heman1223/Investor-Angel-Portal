import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Send, ChevronRight, X, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useMobileMenu } from '../../context/MobileMenuContext';
import { companyAPI } from '../../services/api';

export default function CompanySidebar() {
    const { investor } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const { isOpen: mobileOpen, close: closeMobile } = useMobileMenu();

    const NAV = [
        { to: '/company/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/company/updates', icon: FileText, label: 'Operating Updates', end: false },
        { to: '/company/messaging', icon: Send, label: 'Investor Chat', end: false },
    ];

    const initials = investor?.name
        ? investor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'CU';

    const handleNavClick = () => {
        closeMobile();
    };

    const { data: pendingInvites = [] } = useQuery({
        queryKey: ['companyInvites'],
        queryFn: async () => {
            const res = await companyAPI.getPendingInvites();
            return res.data.data;
        },
        enabled: !!investor && investor.role === 'COMPANY_USER'
    });

    const pendingCount = pendingInvites.length;

    const sidebarContent = (
        <>
            <style>{SB_CSS}</style>

            {/* Brand Section */}
            <div className="sb-brand">
                <div className="sb-logo-bg">
                    <Shield size={20} color="#d4a843" strokeWidth={2.5} />
                </div>
                {!collapsed && (
                    <div className="sb-brand-text">
                        <span className="sb-brand-name">ANGEL</span>
                        <span className="sb-brand-sub">OPERATOR PORTAL</span>
                    </div>
                )}

                {/* Desktop Toggle */}
                <button
                    className={`sb-toggle sb-desktop-only ${collapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <ChevronRight size={12} strokeWidth={3} />
                </button>

                {/* Mobile Close */}
                <button className="sb-mobile-close sb-mobile-only" onClick={closeMobile}>
                    <X size={20} />
                </button>
            </div>

            {/* Main Navigation */}
            <div className="sb-main">
                <nav className="sb-nav">
                    {!collapsed && <p className="sb-section-title">PLATFORM</p>}
                    <div className="sb-items">
                        {NAV.map(item => {
                            const isActive = item.end
                                ? location.pathname === item.to
                                : location.pathname.startsWith(item.to);
                            return (
                                <NavLink key={item.to} to={item.to} end={item.end} onClick={handleNavClick} className="sb-link">
                                    <div className={`sb-item ${isActive ? 'is-active' : ''}`} title={collapsed ? item.label : undefined}>
                                        <div className="sb-item-icon">
                                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                                        </div>
                                        {!collapsed && <span className="sb-item-label">{item.label}</span>}
                                        {!collapsed && item.label === 'Dashboard' && pendingCount > 0 && (
                                            <div className="sb-notif-pill">
                                                {pendingCount}
                                            </div>
                                        )}
                                        {isActive && <div className="sb-active-indicator" />}
                                    </div>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* Footer / User Profile */}
            <div className={`sb-footer ${collapsed ? 'is-collapsed' : ''}`}>
                <div className="sb-user-card">
                    <div className="sb-user-avatar">
                        {initials}
                        <div className="sb-user-status" />
                    </div>
                    {!collapsed && (
                        <div className="sb-user-meta">
                            <span className="sb-user-name">{investor?.name || 'Operator'}</span>
                            <span className="sb-user-role">Startup Admin</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop View */}
            <aside className={`sb-root sb-desktop ${collapsed ? 'is-collapsed' : ''}`}>
                {sidebarContent}
            </aside>

            {/* Mobile View */}
            {mobileOpen && (
                <div className="sb-mobile-overlay" onClick={closeMobile}>
                    <aside className="sb-root sb-mobile" onClick={e => e.stopPropagation()}>
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

const SB_CSS = `
.sb-root {
  display: flex;
  flex-direction: column;
  background: rgba(6, 13, 25, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(212, 168, 67, 0.08);
  height: 100vh;
  position: sticky;
  top: 0;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

.sb-desktop { width: 260px; }
.sb-desktop.is-collapsed { width: 88px; }

.sb-brand {
  height: 84px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  border-bottom: 1px solid rgba(212, 168, 67, 0.05);
}

.sb-logo-bg {
  width: 40px;
  height: 40px;
  background: rgba(212, 168, 67, 0.08);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.sb-brand-text { display: flex; flex-direction: column; }
.sb-brand-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #f0e6d0; letter-spacing: 0.1em; line-height: 1; }
.sb-brand-sub { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #d4a843; letter-spacing: 0.2em; margin-top: 4px; font-weight: 600; }

.sb-toggle {
  position: absolute;
  right: -12px;
  top: 36px;
  width: 24px;
  height: 24px;
  background: #d4a843;
  border: none;
  border-radius: 50%;
  color: #060d19;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(212, 168, 67, 0.3);
}
.sb-toggle:hover { transform: scale(1.1); filter: brightness(1.1); }
.sb-toggle.is-collapsed { transform: rotate(0deg); }
.sb-toggle:not(.is-collapsed) { transform: rotate(180deg); }

.sb-main { flex: 1; padding: 24px 12px; overflow-y: auto; }
.sb-section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: #2d3a4f; letter-spacing: 0.12em; padding: 0 16px; margin-bottom: 16px; }

.sb-items { display: flex; flex-direction: column; gap: 6px; }
.sb-link { text-decoration: none; }

.sb-item {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-radius: 12px;
  color: #6b7a94;
  transition: all 0.2s ease;
  position: relative;
}
.sb-item:hover { background: rgba(255, 255, 255, 0.03); color: #f0e6d0; }
.sb-item.is-active { background: rgba(212, 168, 67, 0.08); color: #d4a843; }

.sb-item-icon { width: 20px; display: flex; justify-content: center; opacity: 0.8; }
.is-active .sb-item-icon { opacity: 1; }
.sb-item-label { font-size: 14px; font-weight: 600; letter-spacing: 0.01em; }

.sb-notif-pill {
    margin-left: auto;
    background: #fb923c;
    color: #060d19;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 800;
    height: 18px;
    min-width: 18px;
    padding: 0 6px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(251, 146, 60, 0.3);
}

.sb-active-indicator {
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    background: #d4a843;
    border-radius: 0 4px 4px 0;
    box-shadow: 0 0 12px rgba(212, 168, 67, 0.4);
}

.sb-footer { padding: 24px 16px; border-top: 1px solid rgba(212, 168, 67, 0.05); }
.sb-user-card { display: flex; align-items: center; gap: 12px; }
.sb-user-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #d4a843, #e8c468);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #060d19;
    font-weight: 700;
    font-size: 13px;
    position: relative;
    box-shadow: 0 4px 12px rgba(212, 168, 67, 0.2);
}
.sb-user-status {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    background: #34d399;
    border: 2px solid #060d19;
    border-radius: 50%;
}
.sb-user-meta { display: flex; flex-direction: column; overflow: hidden; }
.sb-user-name { font-size: 13.5px; font-weight: 700; color: #f0e6d0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.sb-user-role { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3d4f68; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

.sb-mobile-overlay { position: fixed; inset: 0; background: rgba(3, 8, 16, 0.8); backdrop-filter: blur(8px); z-index: 200; }
.sb-mobile { width: 280px; height: 100vh; animation: sb-slide 0.3s var(--ease-out); }
@keyframes sb-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }

.sb-mobile-only { display: none; }
@media (max-width: 900px) {
  .sb-desktop-only { display: none; }
  .sb-mobile-only { display: flex; }
}

.sb-mobile-close {
    margin-left: auto;
    background: transparent;
    border: 1px solid rgba(212, 168, 67, 0.1);
    color: #6b7a94;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}
`;
