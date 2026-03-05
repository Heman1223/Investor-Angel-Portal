/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, Settings, ChevronDown, X, Command, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMobileMenu } from '../../context/MobileMenuContext';
import { useQuery } from '@tanstack/react-query';
import { startupsAPI, alertsAPI } from '../../services/api';

const PAGE_META: Record<string, { title: string; sub: string }> = {
    '/': { title: 'Portfolio Overview', sub: 'All investments · Real-time performance' },
    '/portfolio': { title: 'Investments', sub: 'Active deals, valuations & runway' },
    '/documents': { title: 'Documents', sub: 'Term sheets, memos & agreements' },
    '/alerts': { title: 'Reports & Alerts', sub: 'Risk signals & performance summaries' },
    '/settings': { title: 'Settings', sub: 'Account, preferences & security' },
};

const QUICK_NAV = [
    { label: 'Portfolio Overview', path: '/', icon: '◈' },
    { label: 'All Investments', path: '/portfolio', icon: '◉' },
    { label: 'Documents', path: '/documents', icon: '◎' },
    { label: 'Reports & Alerts', path: '/alerts', icon: '◐' },
    { label: 'Settings', path: '/settings', icon: '◌' },
];

function SearchModal({ onClose }: { onClose: () => void }) {
    const [q, setQ] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { ref.current?.focus(); }, []);
    const navigate = useNavigate();
    const { data: startups } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => {
            const res = await startupsAPI.getAll();
            return res.data;
        }
    });

    const filteredStartups = useMemo(() => {
        if (!q.trim() || !startups) return [];
        const lowerQ = q.toLowerCase();
        return startups.filter((s: any) =>
            s.name.toLowerCase().includes(lowerQ) ||
            s.sector.toLowerCase().includes(lowerQ)
        ).slice(0, 5);
    }, [q, startups]);

    return (
        <div className="hd-overlay" onClick={onClose}>
            <div className="hd-modal" onClick={e => e.stopPropagation()}>
                <div className="hd-modal-input-row">
                    <Search size={15} strokeWidth={1.8} style={{ color: '#6b7a94', flexShrink: 0 }} />
                    <input ref={ref} className="hd-modal-input" placeholder="Search investments, companies, documents…"
                        value={q} onChange={e => setQ(e.target.value)} />
                    <button className="hd-modal-close" onClick={onClose}><X size={14} strokeWidth={2} /></button>
                </div>
                <div className="hd-modal-body">
                    {q.trim() && filteredStartups.length > 0 ? (
                        <>
                            <p className="hd-modal-section">Companies</p>
                            {filteredStartups.map((s: any) => (
                                <div key={s.id} className="hd-modal-item" onClick={() => { navigate(`/portfolio/${s.id}`); onClose(); }}>
                                    <span className="hd-modal-ic">◆</span>
                                    <span className="hd-modal-label">{s.name} <span style={{ opacity: 0.45, fontSize: 10, marginLeft: 6 }}>{s.sector}</span></span>
                                    <ChevronDown size={11} style={{ transform: 'rotate(-90deg)', color: '#2d3a4f' }} />
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <p className="hd-modal-section">Quick navigation</p>
                            {QUICK_NAV.map(n => (
                                <div key={n.path} className="hd-modal-item" onClick={() => { navigate(n.path); onClose(); }}>
                                    <span className="hd-modal-ic">{n.icon}</span>
                                    <span className="hd-modal-label">{n.label}</span>
                                    <ChevronDown size={11} style={{ transform: 'rotate(-90deg)', color: '#2d3a4f' }} />
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="hd-modal-footer">
                    {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, v]) => (
                        <span key={k}><kbd>{k}</kbd>{v}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Header() {
    const { investor, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userOpen, setUserOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { data: alerts } = useQuery({
        queryKey: ['unreadAlerts'],
        queryFn: async () => {
            const res = await alertsAPI.getAll(false);
            return res.data.data;
        }
    });

    const notifs = alerts?.length || 0;
    const { toggle: toggleMobile } = useMobileMenu();

    const meta = PAGE_META[location.pathname] || { title: 'Portfolio', sub: '' };
    const isDash = location.pathname === '/';

    const initials = investor?.name
        ? investor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'AM';

    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
            if (e.key === 'Escape') { setSearchOpen(false); setUserOpen(false); }
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    return (
        <>
            <style>{HD_CSS}</style>
            {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

            <header className="hd-root">
                {/* Mobile hamburger */}
                <button className="hd-hamburger" onClick={toggleMobile} title="Open menu">
                    <Menu size={20} strokeWidth={2} />
                </button>

                {/* Left: page context */}
                <div className="hd-left">
                    <div>
                        <div className="hd-title-row">
                            <h2 className="hd-title">{meta.title}</h2>
                            {isDash && (
                                <span className="hd-live">
                                    <span className="hd-live-dot" /><span>LIVE</span>
                                </span>
                            )}
                        </div>
                        <p className="hd-sub">{meta.sub}</p>
                    </div>
                </div>

                {/* Center: search */}
                <div className="hd-center">
                    <button className="hd-search" onClick={() => setSearchOpen(true)}>
                        <Search size={15} strokeWidth={2} />
                        <span className="hd-search-text">Search portfolio…</span>
                        <span className="hd-shortcut"><Command size={9} strokeWidth={2} />K</span>
                    </button>
                </div>

                {/* Right: actions */}
                <div className="hd-right">
                    <button className="hd-icon" onClick={() => navigate('/alerts')} title="Alerts">
                        <Bell size={17} strokeWidth={2} />
                        {notifs > 0 && <span className="hd-notif">{notifs}</span>}
                    </button>
                    <button className="hd-icon hd-desktop-only" onClick={() => navigate('/settings')} title="Settings">
                        <Settings size={17} strokeWidth={2} />
                    </button>
                    <div className="hd-sep hd-desktop-only" />

                    <div className="hd-user-wrap hd-desktop-only">
                        <button className="hd-user" onClick={() => setUserOpen(!userOpen)}>
                            <div className="hd-user-text">
                                <span className="hd-uname">{investor?.name || 'Arjun Mehta'}</span>
                                <span className="hd-urole">Managing Partner</span>
                            </div>
                            <div className="hd-uavatar">{initials}</div>
                            <ChevronDown size={13} strokeWidth={2.5} style={{ color: '#3d4f68', transition: 'transform 0.3s var(--ease-spring)', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>

                        {userOpen && (
                            <>
                                <div className="hd-bd" onClick={() => setUserOpen(false)} />
                                <div className="hd-dd">
                                    <div className="hd-dd-head">
                                        <div className="hd-dd-avatar">{initials}</div>
                                        <div>
                                            <p className="hd-dd-name">{investor?.name || 'Arjun Mehta'}</p>
                                            <p className="hd-dd-email">{investor?.email || 'arjun@fund.com'}</p>
                                        </div>
                                    </div>
                                    <div className="hd-dd-body">
                                        <button className="hd-dd-item" onClick={() => { navigate('/settings'); setUserOpen(false); }}>
                                            <Settings size={13} strokeWidth={1.8} />Account Settings
                                        </button>
                                        <div className="hd-dd-divider" />
                                        <button className="hd-dd-item hd-dd-logout" onClick={() => { logout(); navigate('/login'); }}>
                                            <LogOut size={13} strokeWidth={1.8} />Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}

const HD_CSS = `
.hd-root{
  display:flex;align-items:center;justify-content:space-between;
  height:64px;padding:0 32px;
  background:rgba(6,13,25,0.88);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(212,168,67,0.07);
  position:sticky;top:0;z-index:50;
  font-family:var(--font-body, 'Inter', sans-serif);
  gap:16px;
}

/* Hamburger — mobile only */
.hd-hamburger{
  display:none;
  width:38px;height:38px;border-radius:10px;
  background:transparent;border:1px solid rgba(212,168,67,0.1);
  align-items:center;justify-content:center;
  cursor:pointer;color:var(--cream, #f0e6d0);
  transition:all 0.2s;flex-shrink:0;
}
.hd-hamburger:hover{background:rgba(212,168,67,0.06);border-color:rgba(212,168,67,0.2);}

@media (max-width:768px){
  .hd-hamburger{display:flex;}
  .hd-root{padding:0 16px;height:54px;gap:10px;}
  .hd-left{display:none;}
  .hd-center{max-width:none;flex:1;}
  .hd-search{height:36px;}
  .hd-search-text{display:none;}
  .hd-shortcut{display:none;}
  .hd-desktop-only{display:none!important;}
}

/* Left */
.hd-left{flex:0 0 auto;}
.hd-title-row{display:flex;align-items:center;gap:12px;margin-bottom:1px;}
.hd-title{font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:20px;font-weight:700;color:var(--cream, #f0e6d0);letter-spacing:-0.02em;}
.hd-live{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.12);border-radius:20px;font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;font-weight:600;color:#d4a843;letter-spacing:0.14em;}
.hd-live-dot{width:6px;height:6px;border-radius:50%;background:#d4a843;animation:hd-pulse 2s ease-in-out infinite;box-shadow:0 0 8px rgba(212,168,67,0.4);}
@keyframes hd-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.3;transform:scale(0.6);}}
.hd-sub{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:10.5px;color:#3d4f68;letter-spacing:0.04em;font-weight:500;}

/* Center */
.hd-center{flex:1;max-width:460px;}
.hd-search{width:100%;height:40px;display:flex;align-items:center;gap:11px;padding:0 15px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;font-family:var(--font-body, 'Inter', sans-serif);font-size:13px;color:#3d4f68;cursor:pointer;transition:all 0.25s var(--ease-smooth, cubic-bezier(0.4,0,0.2,1));text-align:left;}
.hd-search:hover{border-color:rgba(212,168,67,0.22);background:rgba(212,168,67,0.04);color:var(--cream, #f0e6d0);box-shadow:0 0 20px rgba(212,168,67,0.04);}
.hd-search-text{flex:1;}
.hd-shortcut{display:flex;align-items:center;gap:4px;font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:10px;color:#2d3a4f;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:3px 7px;background:rgba(255,255,255,0.03);}

/* Right */
.hd-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.hd-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;color:#3d4f68;position:relative;transition:all 0.2s;}
.hd-icon:hover{background:rgba(212,168,67,0.06);color:#d4a843;}
.hd-notif{position:absolute;top:4px;right:4px;width:16px;height:16px;border-radius:50%;background:#f87171;border:2px solid var(--navy, #060d19);font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:8px;font-weight:700;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(248,113,113,0.3);}
.hd-sep{width:1px;height:22px;background:rgba(212,168,67,0.1);margin:0 6px;}

/* User */
.hd-user-wrap{position:relative;}
.hd-user{display:flex;align-items:center;gap:10px;padding:5px 10px 5px 14px;border-radius:10px;background:transparent;border:none;cursor:pointer;transition:background 0.15s;}
.hd-user:hover{background:rgba(255,255,255,0.03);}
.hd-user-text{text-align:right;}
.hd-uname{display:block;font-size:13.5px;font-weight:600;color:rgba(240,230,208,0.88);line-height:1.3;white-space:nowrap;}
.hd-urole{display:block;font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9.5px;color:#3d4f68;text-transform:uppercase;letter-spacing:0.08em;}
.hd-uavatar{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#d4a843,#b8922e);display:flex;align-items:center;justify-content:center;font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:12px;font-weight:700;color:#060d19;flex-shrink:0;box-shadow:0 2px 8px rgba(212,168,67,0.18);}

/* Dropdown */
.hd-bd{position:fixed;inset:0;z-index:60;}
.hd-dd{position:absolute;top:calc(100% + 8px);right:0;width:236px;background:var(--navy-2, #0a1628);border:1px solid rgba(212,168,67,0.12);border-radius:14px;box-shadow:0 16px 56px rgba(0,0,0,0.65);overflow:hidden;z-index:70;animation:hd-drop 0.2s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));}
@keyframes hd-drop{from{opacity:0;transform:translateY(-8px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
.hd-dd-head{display:flex;align-items:center;gap:12px;padding:16px;background:rgba(212,168,67,0.04);border-bottom:1px solid rgba(212,168,67,0.08);}
.hd-dd-avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#d4a843,#b8922e);display:flex;align-items:center;justify-content:center;font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif);font-size:12px;font-weight:700;color:#060d19;flex-shrink:0;}
.hd-dd-name{font-size:14px;font-weight:600;color:var(--cream, #f0e6d0);}
.hd-dd-email{font-size:10.5px;color:#3d4f68;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;}
.hd-dd-body{padding:8px;}
.hd-dd-item{width:100%;display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:9px;background:none;border:none;cursor:pointer;font-size:13.5px;font-weight:500;color:#6b7a94;font-family:var(--font-body, 'Inter', sans-serif);text-align:left;transition:all 0.15s;}
.hd-dd-item:hover{background:rgba(212,168,67,0.06);color:var(--cream, #f0e6d0);}
.hd-dd-logout{color:#f87171!important;}
.hd-dd-logout:hover{background:rgba(248,113,113,0.08)!important;color:#fca5a5!important;}
.hd-dd-divider{height:1px;background:rgba(212,168,67,0.06);margin:4px 0;}

/* Search overlay */
.hd-overlay{position:fixed;inset:0;z-index:100;background:rgba(3,8,16,0.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;padding-top:80px;animation:hd-fade 0.15s ease;}
@keyframes hd-fade{from{opacity:0;}to{opacity:1;}}
.hd-modal{width:520px;max-width:calc(100vw - 32px);background:var(--navy-2, #0a1628);border:1px solid rgba(212,168,67,0.1);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.65);overflow:hidden;animation:hd-min 0.2s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));}
@keyframes hd-min{from{opacity:0;transform:scale(0.95) translateY(-10px);}to{opacity:1;transform:scale(1) translateY(0);}}
.hd-modal-input-row{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(212,168,67,0.06);}
.hd-modal-input{flex:1;background:none;border:none;outline:none;font-family:var(--font-body, 'Inter', sans-serif);font-size:14px;font-weight:400;color:var(--cream, #f0e6d0);}
.hd-modal-input::placeholder{color:#1e2d42;}
.hd-modal-close{width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.04);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#3d4f68;transition:all 0.15s;}
.hd-modal-close:hover{background:rgba(255,255,255,0.08);color:var(--cream);}
.hd-modal-body{padding:8px 8px 4px;}
.hd-modal-section{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9px;font-weight:500;color:#2d3a4f;letter-spacing:0.14em;text-transform:uppercase;padding:4px 10px;margin-bottom:4px;}
.hd-modal-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;transition:all 0.15s;}
.hd-modal-item:hover{background:rgba(212,168,67,0.05);}
.hd-modal-ic{font-size:12px;color:#d4a843;width:18px;text-align:center;}
.hd-modal-label{flex:1;font-size:13px;font-weight:400;color:#3d4f68;}
.hd-modal-item:hover .hd-modal-label{color:var(--cream, #f0e6d0);}
.hd-modal-footer{display:flex;gap:16px;padding:10px 14px;border-top:1px solid rgba(212,168,67,0.04);background:rgba(0,0,0,0.12);}
.hd-modal-footer span{font-family:var(--font-mono, 'JetBrains Mono', monospace);font-size:9px;color:#2d3a4f;display:flex;align-items:center;gap:5px;}
kbd{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:1px 5px;font-size:9px;color:#3d4f68;font-family:var(--font-mono, 'JetBrains Mono', monospace);}
`;
