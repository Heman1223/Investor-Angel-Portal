import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, ChevronDown, Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMobileMenu } from '../../context/MobileMenuContext';
import { useQuery } from '@tanstack/react-query';
import { companyAPI } from '../../services/api';

const PAGE_META: Record<string, { title: string; sub: string }> = {
    '/company/dashboard': { title: 'Platform Dashboard', sub: 'Real-time performance & network activity' },
    '/company/updates': { title: 'Operating Updates', sub: 'Share performance metrics with your lead investors' },
    '/company/updates/new': { title: 'New Report', sub: 'Submit a monthly operating update' },
    '/company/messaging': { title: 'Secure Messaging', sub: 'Direct communication channel with your investors' },
};

export default function CompanyHeader() {
    const { investor, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userOpen, setUserOpen] = useState(false);

    const { data: pendingInvites = [] } = useQuery({
        queryKey: ['companyInvites'],
        queryFn: async () => {
            const res = await companyAPI.getPendingInvites();
            return res.data.data;
        },
        enabled: !!investor && investor.role === 'COMPANY_USER'
    });

    const notifs = pendingInvites.length;
    const { toggle: toggleMobile } = useMobileMenu();

    const meta = PAGE_META[location.pathname] || { title: 'Company Portal', sub: 'Manage your portfolio company' };
    const isDash = location.pathname === '/company/dashboard';

    const initials = investor?.name
        ? investor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'CU';

    return (
        <header className="ch-root">
            <style>{CH_CSS}</style>

            {/* Mobile Branding */}
            <button className="ch-mobile-toggle ch-mobile-only" onClick={toggleMobile}>
                <Menu size={20} />
            </button>

            {/* Branding/Context (Desktop Only) */}
            <div className="ch-context ch-desktop-only">
                <div className="ch-context-text">
                    <div className="ch-title-group">
                        <h1 className="ch-title">{meta.title}</h1>
                        {isDash && (
                            <div className="ch-live-badge">
                                <span className="ch-live-dot" />
                                <span>LIVE GATEWAY</span>
                            </div>
                        )}
                    </div>
                    <p className="ch-subtitle">{meta.sub}</p>
                </div>
            </div>

            {/* Desktop Quick Actions */}
            <div className="ch-actions">
                <div className="ch-action-items">
                    <button
                        className={`ch-action-btn ${notifs > 0 ? 'has-notif' : ''}`}
                        onClick={() => navigate('/company/dashboard')}
                        title="Invitations & System Alerts"
                    >
                        <Bell size={18} strokeWidth={2} />
                        {notifs > 0 && <span className="ch-badge">{notifs}</span>}
                    </button>

                    <div className="ch-sep ch-desktop-only" />

                    <div className="ch-user-wrap">
                        <button className="ch-user-trigger" onClick={() => setUserOpen(!userOpen)}>
                            <div className="ch-user-details ch-desktop-only">
                                <span className="ch-user-name">{investor?.name || 'Operator'}</span>
                                <span className="ch-user-role">Founder License</span>
                            </div>
                            <div className="ch-user-avatar">{initials}</div>
                            <ChevronDown size={14} className={`ch-user-arrow ${userOpen ? 'is-open' : ''}`} />
                        </button>

                        {userOpen && (
                            <>
                                <div className="ch-dropdown-overlay" onClick={() => setUserOpen(false)} />
                                <div className="ch-dropdown">
                                    <div className="ch-dropdown-head">
                                        <div className="ch-dropdown-avatar">{initials}</div>
                                        <div className="ch-dropdown-meta">
                                            <p className="ch-dropdown-name">{investor?.name || 'Operator'}</p>
                                            <p className="ch-dropdown-email">{investor?.email || 'operator@startup.io'}</p>
                                        </div>
                                    </div>
                                    <div className="ch-dropdown-body">
                                        <div className="ch-dropdown-section">
                                            <p className="ch-dropdown-label">SECURITY</p>
                                            <div className="ch-dropdown-item quiet">
                                                <ShieldCheck size={14} />
                                                <span>Encrypted Session</span>
                                            </div>
                                        </div>
                                        <div className="ch-dropdown-divider" />
                                        <button className="ch-dropdown-item logout" onClick={() => { logout(); navigate('/login'); }}>
                                            <LogOut size={14} />
                                            <span>Terminate Session</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

const CH_CSS = `
.ch-root {
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(6, 13, 25, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(212, 168, 67, 0.08);
  position: sticky;
  top: 0;
  z-index: 90;
}

.ch-mobile-toggle {
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.15);
  color: #6b7a94;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ch-context { display: flex; flex-direction: column; }
.ch-title-group { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.ch-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #f0e6d0; letter-spacing: -0.02em; }
.ch-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; color: #3d4f68; font-weight: 500; }

.ch-live-badge {
    display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.15); border-radius: 20px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #34d399; letter-spacing: 0.12em;
}
.ch-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: ch-pulse 2s infinite; box-shadow: 0 0 10px rgba(52, 211, 153, 0.4); }
@keyframes ch-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }

.ch-actions { display: flex; align-items: center; }
.ch-action-items { display: flex; align-items: center; gap: 8px; }

.ch-action-btn {
    width: 42px; height: 42px; border-radius: 14px; background: transparent; border: none; color: #3d4f68; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: all 0.2s;
}
.ch-action-btn:hover { background: rgba(255, 255, 255, 0.03); color: #d4a843; }
.ch-action-btn.has-notif { color: #d4a843; }
.ch-badge { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; border-radius: 50%; background: #f87171; border: 2px solid #060d19; font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 800; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(248, 113, 113, 0.3); }

.ch-sep { width: 1px; height: 24px; background: rgba(212, 168, 67, 0.08); margin: 0 12px; }

.ch-user-wrap { position: relative; }
.ch-user-trigger {
    display: flex; align-items: center; gap: 14px; padding: 6px 6px 6px 14px; border-radius: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid transparent; cursor: pointer; transition: all 0.2s;
}
.ch-user-trigger:hover { background: rgba(212, 168, 67, 0.04); border-color: rgba(212, 168, 67, 0.1); }
.ch-user-details { text-align: right; }
.ch-user-name { display: block; font-size: 14px; font-weight: 700; color: #f0e6d0; line-height: 1.2; }
.ch-user-role { display: block; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3d4f68; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-top: 2px; }
.ch-user-avatar { width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #d4a843, #e8c468); color: #060d19; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; box-shadow: 0 4px 12px rgba(212, 168, 67, 0.2); }
.ch-user-arrow { color: #3d4f68; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.ch-user-arrow.is-open { transform: rotate(180deg); color: #d4a843; }

.ch-dropdown {
    position: absolute; top: calc(100% + 12px); right: 0; width: 240px; background: rgba(10, 22, 40, 0.7); backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px); border: 1px solid rgba(212, 168, 67, 0.12); border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); overflow: hidden; z-index: 100; animation: ch-drop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes ch-drop { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.ch-dropdown-overlay { position: fixed; inset: 0; z-index: 95; }

.ch-dropdown-head { display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(212, 168, 67, 0.04); border-bottom: 1px solid rgba(212, 168, 67, 0.08); }
.ch-dropdown-avatar { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #d4a843, #e8c468); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #060d19; font-size: 13px; }
.ch-dropdown-name { font-size: 15px; font-weight: 700; color: #f0e6d0; line-height: 1.2; }
.ch-dropdown-email { font-size: 11px; color: #3d4f68; margin-top: 2px; }

.ch-dropdown-body { padding: 12px; }
.ch-dropdown-section { padding: 4px; }
.ch-dropdown-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #2d3a4f; letter-spacing: 0.12em; margin-bottom: 8px; margin-left: 8px; }
.ch-dropdown-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; background: none; border: none; font-size: 13.5px; font-weight: 600; color: #6b7a94; cursor: pointer; transition: all 0.2s; }
.ch-dropdown-item:hover:not(.quiet) { background: rgba(212, 168, 67, 0.08); color: #f0e6d0; }
.ch-dropdown-item.quiet { cursor: default; opacity: 0.8; }
.ch-dropdown-item.logout { color: #f87171; }
.ch-dropdown-item.logout:hover { background: rgba(248, 113, 113, 0.08); color: #fca5a5; }
.ch-dropdown-divider { height: 1px; background: rgba(212, 168, 67, 0.06); margin: 8px 12px; }

.ch-mobile-only { display: none; }
@media (max-width: 900px) {
  .ch-desktop-only { display: none; }
  .ch-mobile-only { display: flex; }
  .ch-root { padding: 0 16px; height: 68px; }
}
`;
