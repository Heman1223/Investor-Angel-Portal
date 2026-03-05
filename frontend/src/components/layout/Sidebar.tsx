import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard, Rocket, FolderOpen, FileText,
    Settings, Plus, TrendingUp, ChevronRight, BarChart3, Zap, GitCompare, Bell, Calculator, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMobileMenu } from '../../context/MobileMenuContext';
import { dashboardAPI, alertsAPI } from '../../services/api';
import { formatCurrencyCompact, paiseToRupees } from '../../utils/formatters';

function MiniChart() {
    return (
        <svg width="100%" height="28" viewBox="0 0 120 28" fill="none" preserveAspectRatio="none">
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a843" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M0,22 L10,20 L20,17 L30,19 L40,14 L50,15 L60,11 L70,12 L80,7 L90,8 L100,5 L110,4 L120,2"
                stroke="#d4a843" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0,22 L10,20 L20,17 L30,19 L40,14 L50,15 L60,11 L70,12 L80,7 L90,8 L100,5 L110,4 L120,2 L120,28 L0,28 Z"
                fill="url(#cg)" />
        </svg>
    );
}

export default function Sidebar() {
    const { investor } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const { isOpen: mobileOpen, close: closeMobile } = useMobileMenu();

    // Fetch real portfolio data
    const { data: dashboard } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await dashboardAPI.get();
            return res.data.data;
        },
        staleTime: 60000,
    });

    // Fetch unread alerts count
    const { data: alerts } = useQuery({
        queryKey: ['alerts', 'unread'],
        queryFn: async () => {
            const res = await alertsAPI.getAll(false);
            return res.data.data;
        },
        staleTime: 60000,
    });

    const portfolioValue = dashboard?.currentPortfolioValue ? paiseToRupees(dashboard.currentPortfolioValue) : 0;
    const portfolioMOIC = dashboard?.portfolioMOIC ?? 0;
    const moicChange = portfolioMOIC > 0 ? `${((portfolioMOIC - 1) * 100).toFixed(1)}%` : '0%';
    const moicPositive = portfolioMOIC >= 1;
    const activeCount = dashboard?.activeCount ?? 0;
    const exitedCount = dashboard?.exitedCount ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadAlertCount = Array.isArray(alerts) ? alerts.filter((a: any) => !a.isRead).length : 0;

    const NAV = [
        { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
        { to: '/portfolio', icon: Rocket, label: 'Investments', end: false },
        { to: '/documents', icon: FolderOpen, label: 'Documents', end: false },
        { to: '/alerts', icon: Bell, label: 'Alerts', end: false, badge: unreadAlertCount > 0 ? `${unreadAlertCount}` : undefined },
        { to: '/reports', icon: FileText, label: 'Reports', end: false },
        { to: '/compare', icon: GitCompare, label: 'Compare', end: false },
        { to: '/scenarios', icon: Calculator, label: 'Scenarios', end: false },
        { to: '/settings', icon: Settings, label: 'Settings', end: false },
    ];

    const initials = investor?.name
        ? investor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'MP';

    const handleNavClick = () => {
        closeMobile();
    };

    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="sb-brand">
                <div className="sb-logo">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="#d4a843" strokeWidth="1.5" fill="none" />
                        <circle cx="12" cy="12" r="2.5" fill="#d4a843" />
                    </svg>
                </div>
                {!collapsed && (
                    <div className="sb-brand-text">
                        <span className="sb-brand-name">ANGEL</span>
                        <span className="sb-brand-sub">Investor Portfolio</span>
                    </div>
                )}
                {/* Desktop collapse toggle */}
                <button className={`sb-toggle sb-desktop-only ${collapsed ? 'sb-toggle-collapsed' : ''}`} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
                    <ChevronRight size={12} strokeWidth={2.5}
                        style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1))' }} />
                </button>
                {/* Mobile close button */}
                <button className="sb-mobile-close sb-mobile-only" onClick={closeMobile} title="Close menu">
                    <X size={18} strokeWidth={2} />
                </button>
            </div>
            {/* Scrollable main area */}
            <div className="sb-main">
                {/* NAV value card */}
                {!collapsed && (
                    <div className="sb-nav-card">
                        <div className="sb-nav-card-top">
                            <div>
                                <p className="sb-nav-card-lbl">Portfolio NAV</p>
                                <p className="sb-nav-card-val">
                                    {portfolioValue > 0 ? formatCurrencyCompact(portfolioValue) : '₹0'}
                                </p>
                            </div>
                            {portfolioValue > 0 && (
                                <div className="sb-nav-card-badge" style={!moicPositive ? { color: '#f87171', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.18)' } : undefined}>
                                    <Zap size={9} strokeWidth={3} /> {moicPositive ? '+' : ''}{moicChange}
                                </div>
                            )}
                        </div>
                        <MiniChart />
                    </div>
                )}

                {/* Navigation */}
                <nav className="sb-nav">
                    {!collapsed && <p className="sb-nav-lbl">Menu</p>}
                    {NAV.map(item => {
                        const isActive = item.end
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to);
                        return (
                            <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }} onClick={handleNavClick}>
                                <div className={`sb-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                                    <div className="sb-item-left">
                                        <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.6} />
                                        {!collapsed && <span className="sb-item-lbl">{item.label}</span>}
                                    </div>
                                    {!collapsed && item.badge && <span className="sb-badge">{item.badge}</span>}
                                    {collapsed && item.badge && <span className="sb-badge-pip" />}
                                </div>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Quick metrics */}
                {!collapsed && (
                    <div className="sb-metrics">
                        <p className="sb-nav-lbl">Quick View</p>
                        <div className="sb-metrics-row">
                            <div className="sb-metric">
                                <BarChart3 size={13} color="#d4a843" strokeWidth={2} />
                                <div>
                                    <p className="sb-metric-val">{activeCount}</p>
                                    <p className="sb-metric-lbl">Active</p>
                                </div>
                            </div>
                            <div className="sb-metric-sep" />
                            <div className="sb-metric">
                                <TrendingUp size={13} color="#60a5fa" strokeWidth={2} />
                                <div>
                                    <p className="sb-metric-val">{exitedCount}</p>
                                    <p className="sb-metric-lbl">Exits</p>
                                </div>
                            </div>
                            <div className="sb-metric-sep" />
                            <div className="sb-metric">
                                <Bell size={13} color="#fb923c" strokeWidth={2} />
                                <div>
                                    <p className="sb-metric-val">{unreadAlertCount}</p>
                                    <p className="sb-metric-lbl">Alerts</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New Investment */}
            <div className="sb-cta-area">
                <NavLink to="/portfolio" style={{ textDecoration: 'none' }} onClick={handleNavClick}>
                    <button className={`sb-cta ${collapsed ? 'sb-cta-sm' : ''}`} title={collapsed ? 'Add Investment' : undefined}>
                        <Plus size={17} strokeWidth={2.5} />
                        {!collapsed && <span>Add Investment</span>}
                    </button>
                </NavLink>
            </div>

            {/* User */}
            <div className={`sb-user ${collapsed ? 'sb-user-sm' : ''}`}>
                <div className="sb-avatar">{initials}</div>
                {!collapsed && (
                    <div className="sb-user-info">
                        <p className="sb-user-name">{investor?.name || 'Arjun Mehta'}</p>
                        <p className="sb-user-role">Managing Partner</p>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <>
            <style>{SB_CSS}</style>
            {/* Desktop sidebar */}
            <aside className={`sb-root sb-desktop-sidebar ${collapsed ? 'sb-collapsed' : ''}`}>
                {sidebarContent}
            </aside>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="sb-mobile-backdrop" onClick={closeMobile}>
                    <aside className="sb-root sb-mobile-sidebar" onClick={e => e.stopPropagation()}>
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

const SB_CSS = `
.sb-root{
  width:256px;height:100%;
  background:rgba(6,13,25,0.92);
  backdrop-filter:blur(24px);
  -webkit-backdrop-filter:blur(24px);
  border-right:1px solid rgba(212,168,67,0.08);
  display:flex;flex-direction:column;flex-shrink:0;
  transition:width 0.3s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  overflow:hidden;
  font-family:var(--font-body, 'Inter', sans-serif);
  position:relative;
  z-index:2;
}
.sb-root::before{
  content:'';position:absolute;top:0;left:0;right:0;height:300px;
  background:radial-gradient(ellipse 120% 60% at 50% -10%,rgba(212,168,67,0.05) 0%,transparent 70%);
  pointer-events:none;
}
.sb-collapsed{width:70px;}

/* Desktop / Mobile visibility */
.sb-desktop-only { display: flex; }
.sb-mobile-only { display: none; }

@media (max-width: 768px) {
  .sb-desktop-sidebar { display: none !important; }
  .sb-desktop-only { display: none !important; }
  .sb-mobile-only { display: flex !important; }
}
@media (min-width: 769px) {
  .sb-mobile-backdrop { display: none !important; }
}

/* Mobile backdrop + drawer */
.sb-mobile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(3,8,16,0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: sb-fade-in 0.2s ease;
}
@keyframes sb-fade-in { from { opacity:0; } to { opacity:1; } }

.sb-mobile-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 280px;
  max-width: 85vw;
  z-index: 201;
  animation: sb-slide-in 0.3s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  border-right: 1px solid rgba(212,168,67,0.1);
  box-shadow: 20px 0 60px rgba(0,0,0,0.6);
}
@keyframes sb-slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }

.sb-mobile-close {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255,255,255,0.45);
  transition: all 0.2s; flex-shrink: 0;
}
.sb-mobile-close:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

/* Scrollable main area */
.sb-main{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;}
.sb-main::-webkit-scrollbar{width:3px;}
.sb-main::-webkit-scrollbar-track{background:transparent;}
.sb-main::-webkit-scrollbar-thumb{background:rgba(212,168,67,0.1);border-radius:10px;}

.sb-brand{display:flex;align-items:center;gap:12px;padding:22px 18px 18px;border-bottom:1px solid rgba(212,168,67,0.06);position:relative;}
.sb-logo{width:36px;height:36px;background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.14);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.3s;}
.sb-logo:hover{border-color:rgba(212,168,67,0.3);box-shadow:0 0 20px rgba(212,168,67,0.08);}
.sb-brand-text{flex:1;min-width:0;}
.sb-brand-name{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:14px;font-weight:600;letter-spacing:0.2em;color:var(--cream, #f0e6d0);display:block;white-space:nowrap;}
.sb-brand-sub{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;color:rgba(212,168,67,0.7);letter-spacing:0.1em;margin-top:3px;display:block;}
.sb-toggle{width:24px;height:24px;border-radius:7px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,0.35);transition:all 0.2s;flex-shrink:0;}
.sb-toggle-collapsed{position:absolute;right:22px;}
.sb-toggle:hover{background:rgba(212,168,67,0.08);color:var(--gold, #d4a843);border-color:rgba(212,168,67,0.2);}

/* NAV value card */
.sb-nav-card{margin:16px 14px 8px;background:rgba(212,168,67,0.04);border:1px solid rgba(212,168,67,0.1);border-radius:14px;padding:16px 16px 10px;flex-shrink:0;transition:border-color 0.3s;}
.sb-nav-card:hover{border-color:rgba(212,168,67,0.2);}
.sb-nav-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;}
.sb-nav-card-lbl{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:5px;}
.sb-nav-card-val{font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:24px;font-weight:800;color:var(--cream, #f0e6d0);line-height:1;letter-spacing:-0.02em;}
.sb-nav-card-badge{display:flex;align-items:center;gap:4px;font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:10px;font-weight:600;color:#d4a843;background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.15);border-radius:7px;padding:4px 8px;flex-shrink:0;}

/* Nav */
.sb-nav{padding:14px 12px 10px;}
.sb-nav-lbl{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.18);padding:0 10px;margin-bottom:10px;}
.sb-item{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:11px;cursor:pointer;color:rgba(255,255,255,0.38);transition:all 0.2s var(--ease-smooth, cubic-bezier(0.4,0,0.2,1));position:relative;overflow:hidden;margin-bottom:2px;}
.sb-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%) scaleY(0);width:3px;height:55%;background:linear-gradient(180deg, #d4a843, #e8c468);border-radius:0 3px 3px 0;transition:transform 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));transform-origin:center;}
.sb-item.active::before{transform:translateY(-50%) scaleY(1);}
.sb-item:hover:not(.active){background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.7);}
.sb-item.active{background:rgba(212,168,67,0.08);color:#d4a843;}
.sb-item-left{display:flex;align-items:center;gap:12px;}
.sb-item-lbl{font-size:13.5px;font-weight:500;letter-spacing:0.01em;}
.sb-badge{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:10.5px;font-weight:600;background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.18);border-radius:7px;padding:2px 8px;line-height:1.4;}
.sb-badge-pip{position:absolute;top:10px;right:10px;width:6px;height:6px;background:#f87171;border-radius:50%;box-shadow:0 0 6px rgba(248,113,113,0.4);}

/* Metrics */
.sb-metrics{padding:6px 12px 10px;}
.sb-metrics-row{display:flex;align-items:center;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:14px 14px;}
.sb-metric{display:flex;align-items:center;gap:9px;flex:1;}
.sb-metric-val{font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:20px;font-weight:800;color:var(--cream, #f0e6d0);line-height:1;letter-spacing:-0.01em;}
.sb-metric-lbl{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9px;color:rgba(255,255,255,0.28);letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;}
.sb-metric-sep{width:1px;height:30px;background:rgba(255,255,255,0.05);margin:0 4px;}

/* CTA */
.sb-cta-area{padding:10px 12px 14px;}
.sb-cta{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;background:linear-gradient(135deg, #d4a843, #e8c468);border:none;border-radius:12px;font-family:var(--font-body, 'Inter', sans-serif);font-size:13.5px;font-weight:600;color:#060d19;cursor:pointer;transition:all 0.25s var(--ease-out, cubic-bezier(0.16,1,0.3,1));box-shadow:0 2px 16px rgba(212,168,67,0.25);white-space:nowrap;letter-spacing:0.02em;position:relative;overflow:hidden;}
.sb-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%);opacity:0;transition:opacity 0.2s;}
.sb-cta:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(212,168,67,0.35);}
.sb-cta:hover::before{opacity:1;}
.sb-cta-sm{padding:11px;width:46px;}

/* User */
.sb-user{display:flex;align-items:center;gap:12px;padding:16px 18px;border-top:1px solid rgba(212,168,67,0.06);background:rgba(0,0,0,0.12);}
.sb-user-sm{justify-content:center;padding:16px;}
.sb-avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#d4a843,#b8922e);display:flex;align-items:center;justify-content:center;font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:12.5px;font-weight:700;color:#060d19;flex-shrink:0;letter-spacing:0.02em;box-shadow:0 2px 8px rgba(212,168,67,0.2);}
.sb-user-name{font-size:13.5px;font-weight:600;color:rgba(240,230,208,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;}
.sb-user-role{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;color:rgba(255,255,255,0.3);letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;}
.sb-user-info{min-width:0;flex:1;}
`;
