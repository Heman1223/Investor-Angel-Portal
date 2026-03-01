import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard, Rocket, FolderOpen, FileText,
    Settings, Plus, TrendingUp, ChevronRight, BarChart3, Zap, GitCompare, Bell, Calculator
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI, alertsAPI } from '../../services/api';
import { formatCurrencyCompact, paiseToRupees } from '../../utils/formatters';

function MiniChart() {
    return (
        <svg width="100%" height="28" viewBox="0 0 120 28" fill="none" preserveAspectRatio="none">
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C5A454" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#C5A454" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M0,22 L10,20 L20,17 L30,19 L40,14 L50,15 L60,11 L70,12 L80,7 L90,8 L100,5 L110,4 L120,2"
                stroke="#C5A454" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0,22 L10,20 L20,17 L30,19 L40,14 L50,15 L60,11 L70,12 L80,7 L90,8 L100,5 L110,4 L120,2 L120,28 L0,28 Z"
                fill="url(#cg)" />
        </svg>
    );
}

export default function Sidebar() {
    const { investor } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

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

    return (
        <>
            <style>{SB_CSS}</style>
            <aside className={`sb-root ${collapsed ? 'sb-collapsed' : ''}`}>

                {/* Brand */}
                <div className="sb-brand">
                    <div className="sb-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="#C5A454" strokeWidth="1.5" fill="none" />
                            <circle cx="12" cy="12" r="2" fill="#C5A454" />
                        </svg>
                    </div>
                    {!collapsed && (
                        <div className="sb-brand-text">
                            <span className="sb-brand-name">ANGEL</span>
                            <span className="sb-brand-sub">Investor Portfolio</span>
                        </div>
                    )}
                    <button className={`sb-toggle ${collapsed ? 'sb-toggle-collapsed' : ''}`} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
                        <ChevronRight size={12} strokeWidth={2.5}
                            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s' }} />
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
                                    <div className="sb-nav-card-badge" style={!moicPositive ? { color: '#F87171', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.18)' } : undefined}>
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
                                <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
                                    <div className={`sb-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                                        <div className="sb-item-left">
                                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
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
                                    <BarChart3 size={14} color="#C5A454" strokeWidth={2} />
                                    <div>
                                        <p className="sb-metric-val">{activeCount}</p>
                                        <p className="sb-metric-lbl">Active</p>
                                    </div>
                                </div>
                                <div className="sb-metric-sep" />
                                <div className="sb-metric">
                                    <TrendingUp size={14} color="#60A5FA" strokeWidth={2} />
                                    <div>
                                        <p className="sb-metric-val">{exitedCount}</p>
                                        <p className="sb-metric-lbl">Exits</p>
                                    </div>
                                </div>
                                <div className="sb-metric-sep" />
                                <div className="sb-metric">
                                    <Bell size={14} color="#FB923C" strokeWidth={2} />
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
                    <NavLink to="/portfolio" style={{ textDecoration: 'none' }}>
                        <button className={`sb-cta ${collapsed ? 'sb-cta-sm' : ''}`} title={collapsed ? 'Add Investment' : undefined}>
                            <Plus size={18} strokeWidth={2.5} />
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
            </aside>
        </>
    );
}

const SB_CSS = `
.sb-root{
  width:260px;height:100%;
  background:var(--navy, #0B1221);
  border-right:1px solid rgba(197,164,84,0.12);
  display:flex;flex-direction:column;flex-shrink:0;
  transition:width 0.25s cubic-bezier(0.4,0,0.2,1);
  overflow:hidden;
  font-family:var(--font-body, 'Inter', sans-serif);
  position:relative;
}
.sb-root::before{
  content:'';position:absolute;top:0;left:0;right:0;height:260px;
  background:radial-gradient(ellipse 100% 50% at 50% 0%,rgba(197,164,84,0.06) 0%,transparent 65%);
  pointer-events:none;
}
.sb-collapsed{width:72px;}

/* Scrollable main area */
.sb-main{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;}
.sb-main::-webkit-scrollbar{width:4px;}
.sb-main::-webkit-scrollbar-track{background:transparent;}
.sb-main::-webkit-scrollbar-thumb{background:rgba(197,164,84,0.12);border-radius:10px;}

.sb-brand{display:flex;align-items:center;gap:12px;padding:24px 18px 20px;border-bottom:1px solid rgba(197,164,84,0.08);position:relative;}
.sb-logo{width:36px;height:36px;background:rgba(197,164,84,0.08);border:1px solid rgba(197,164,84,0.18);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sb-brand-text{flex:1;min-width:0;}
.sb-brand-name{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:14px;font-weight:600;letter-spacing:0.18em;color:var(--cream, #EDE5CC);display:block;white-space:nowrap;}
.sb-brand-sub{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:10px;color:rgba(197,164,84,0.78);letter-spacing:0.1em;margin-top:4px;display:block;}
.sb-toggle{width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,0.4);transition:all 0.2s;flex-shrink:0;}
.sb-toggle-collapsed{position:absolute;right:24px;}
.sb-toggle:hover{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);}

/* NAV value card */
.sb-nav-card{margin:18px 16px 8px;background:rgba(197,164,84,0.06);border:1px solid rgba(197,164,84,0.14);border-radius:12px;padding:16px 16px 10px;flex-shrink:0;}
.sb-nav-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;}
.sb-nav-card-lbl{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:10px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:4px;}
.sb-nav-card-val{font-family:var(--font-display, 'Syne', sans-serif);font-size:24px;font-weight:700;color:var(--cream, #EDE5CC);line-height:1;}
.sb-nav-card-badge{display:flex;align-items:center;gap:4px;font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:10px;font-weight:600;color:#C5A454;background:rgba(197,164,84,0.1);border:1px solid rgba(197,164,84,0.18);border-radius:6px;padding:4px 8px;flex-shrink:0;}

/* Nav */
.sb-nav{padding:16px 14px 10px;}
.sb-nav-lbl{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.2);padding:0 10px;margin-bottom:10px;}
.sb-item{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,0.4);transition:background 0.15s,color 0.15s;position:relative;overflow:hidden;margin-bottom:2px;}
.sb-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:0;background:#C5A454;border-radius:0 2px 2px 0;transition:height 0.2s;}
.sb-item.active::before{height:55%;}
.sb-item:hover:not(.active){background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.75);}
.sb-item.active{background:rgba(197,164,84,0.1);color:#C5A454;}
.sb-item-left{display:flex;align-items:center;gap:12px;}
.sb-item-lbl{font-size:14px;font-weight:500;letter-spacing:0.02em;}
.sb-badge{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:11px;font-weight:600;background:rgba(248,113,113,0.15);color:#F87171;border:1px solid rgba(248,113,113,0.2);border-radius:6px;padding:2px 8px;line-height:1.4;}
.sb-badge-pip{position:absolute;top:10px;right:10px;width:6px;height:6px;background:#F87171;border-radius:50%;}

/* Metrics */
.sb-metrics{padding:6px 14px 10px;}
.sb-metrics-row{display:flex;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px 16px;}
.sb-metric{display:flex;align-items:center;gap:10px;flex:1;}
.sb-metric-val{font-family:var(--font-display, 'Syne', sans-serif);font-size:20px;font-weight:700;color:var(--cream, #EDE5CC);line-height:1;}
.sb-metric-lbl{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:9.5px;color:rgba(255,255,255,0.3);letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;}
.sb-metric-sep{width:1px;height:32px;background:rgba(255,255,255,0.06);margin:0 4px;}

/* CTA */
.sb-cta-area{padding:10px 14px 14px;}
.sb-cta{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;background:#C5A454;border:none;border-radius:10px;font-family:var(--font-body, 'Inter', sans-serif);font-size:14px;font-weight:600;color:#0B1221;cursor:pointer;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;box-shadow:0 2px 14px rgba(197,164,84,0.28);white-space:nowrap;letter-spacing:0.02em;}
.sb-cta:hover{background:#D4B96A;transform:translateY(-1px);box-shadow:0 4px 20px rgba(197,164,84,0.4);}
.sb-cta-sm{padding:12px;width:48px;}

/* User */
.sb-user{display:flex;align-items:center;gap:12px;padding:16px 18px;border-top:1px solid rgba(197,164,84,0.08);background:rgba(0,0,0,0.15);}
.sb-user-sm{justify-content:center;padding:16px;}
.sb-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#C5A454,#A08535);display:flex;align-items:center;justify-content:center;font-family:var(--font-display, 'Syne', sans-serif);font-size:14px;font-weight:700;color:#0B1221;flex-shrink:0;letter-spacing:0.02em;}
.sb-user-name{font-size:14px;font-weight:600;color:rgba(237,229,204,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;}
.sb-user-role{font-family:var(--font-mono, 'IBM Plex Mono', monospace);font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;}
.sb-user-info{min-width:0;flex:1;}
`;
