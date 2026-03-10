import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, AlertCircle, Calendar, CheckCircle2, XCircle, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { companyAPI } from '../services/api';
import { formatCurrencyCompact } from '../utils/formatters';

// ── Animated Number Component ──────────────────────────────
const AnimatedNumber = ({ value, formatter = (v: number) => String(v), duration = 1200 }: { value: number, formatter?: (v: number) => string, duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);

            setDisplayValue(value * easeProgress);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{formatter(displayValue)}</>;
};

export default function CompanyDashboard() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: dashboard, isLoading, error } = useQuery({
        queryKey: ['companyDashboard'],
        queryFn: async () => {
            const res = await companyAPI.getDashboard();
            return res.data.data;
        },
    });

    const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
        queryKey: ['companyInvites'],
        queryFn: async () => {
            const res = await companyAPI.getPendingInvites();
            return res.data.data;
        },
    });

    const handleAcceptInvite = async (inviteId: string) => {
        try {
            await companyAPI.acceptInvite(inviteId);
            toast.success('Invite accepted! You now have access to this startup.');
            queryClient.invalidateQueries({ queryKey: ['companyInvites'] });
            queryClient.invalidateQueries({ queryKey: ['companyDashboard'] });
        } catch (err: any) {
            toast.error(err.response?.data?.error?.message || 'Failed to accept invite');
        }
    };

    const handleDeclineInvite = async (inviteId: string) => {
        try {
            await companyAPI.declineInvite(inviteId);
            toast.success('Invite declined.');
            queryClient.invalidateQueries({ queryKey: ['companyInvites'] });
        } catch (err: any) {
            toast.error(err.response?.data?.error?.message || 'Failed to decline invite');
        }
    };

    useEffect(() => {
        if (pendingInvites.length > 0) {
            toast((t) => (
                <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-orange-400" />
                    <div className="flex-1">
                        <p className="font-bold text-sm">New Invitations</p>
                        <p className="text-xs opacity-80">You have {pendingInvites.length} pending startup invite(s).</p>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-[10px] font-bold"
                    >DISMISS</button>
                </div>
            ), { duration: 6000, id: 'pending-invites-toast' });
        }
    }, [pendingInvites.length]);

    if (isLoading || invitesLoading) {
        return (
            <>
                <style>{DASHBOARD_CSS}</style>
                <div className="d-root">
                    <div className="d-page-header">
                        <div>
                            <div style={{ width: 160, height: 22, background: 'rgba(197,164,84,0.08)', borderRadius: 6, marginBottom: 8 }} />
                            <div style={{ width: 240, height: 14, background: 'rgba(197,164,84,0.06)', borderRadius: 4 }} />
                        </div>
                    </div>
                    <div className="d-metric-grid">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="d-shimmer" style={{ height: 110, borderRadius: 14 }} />
                        ))}
                    </div>
                    <div className="d-charts-row">
                        <div className="d-shimmer" style={{ height: 340, borderRadius: 14, gridColumn: 'span 2' }} />
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} />
                <p>Failed to load dashboard data. Please try again.</p>
            </div>
        );
    }

    const startups = dashboard?.startups || [];
    const pendingUpdates = dashboard?.pendingUpdatesCount || 0;

    const totalRevenue = startups.reduce((sum: number, s: any) => sum + (s.latestUpdate?.revenue || 0), 0);
    const totalCash = startups.reduce((sum: number, s: any) => sum + (s.latestUpdate?.cashBalance || 0), 0);

    const metrics = [
        { label: 'Total MRR', rawValue: totalRevenue, formatter: formatCurrencyCompact, icon: TrendingUp, accent: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
        { label: 'Cash Balance', rawValue: totalCash, formatter: formatCurrencyCompact, icon: DollarSign, accent: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
        { label: 'Pending Updates', rawValue: pendingUpdates, formatter: (v: number) => String(Math.round(v)), icon: FileText, accent: '#F87171', bg: 'rgba(248,113,113,0.1)' },
    ];

    return (
        <div className="d-root">
            <style>{DASHBOARD_CSS}</style>

            {pendingInvites.length > 0 && (
                <div className="d-bottom-row" style={{ animation: 'd-fadein 0.6s ease 0.1s both', marginBottom: '16px' }}>
                    <div className="d-alerts-panel">
                        <div className="d-alerts-head">
                            <div className="d-alerts-icon-wrap" style={{ background: 'rgba(251,146,60,0.1)', borderColor: 'rgba(251,146,60,0.2)' }}>
                                <AlertCircle size={16} color="#FB923C" strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="d-card-title">Pending Invitations</h3>
                                <p className="d-alerts-count" style={{ color: '#FB923C' }}>
                                    {pendingInvites.length} invite{pendingInvites.length !== 1 ? 's' : ''} awaiting response
                                </p>
                            </div>
                        </div>
                        <div className="d-alerts-list">
                            {pendingInvites.map((invite: any) => (
                                <div key={invite.id} className="d-alert-item" style={{ alignItems: 'center' }}>
                                    <span className="d-alert-dot" style={{ background: '#FB923C', marginTop: 0 }} />
                                    <div className="d-alert-body" style={{ flex: 1 }}>
                                        <p className="d-alert-title" style={{ color: '#FDE68A', marginBottom: 0 }}>
                                            {invite.startup.name}
                                        </p>
                                        <p className="d-alert-msg" style={{ fontSize: '12px' }}>
                                            Invited by <strong style={{ color: '#d4a843', fontWeight: 500 }}>{invite.inviter.name}</strong> as <span style={{ textTransform: 'capitalize' }}>{invite.companyRole}</span>
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleDeclineInvite(invite.id)} className="d-btn-decline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(248,113,113,0.1)', color: '#F87171', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            <XCircle size={14} /> Decline
                                        </button>
                                        <button onClick={() => handleAcceptInvite(invite.id)} className="d-btn-accept" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(74,222,128,0.1)', color: '#4ADE80', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            <CheckCircle2 size={14} /> Accept
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="d-metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {metrics.map((m, i) => (
                    <div key={i} className="d-metric-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="d-metric-top">
                            <span className="d-metric-label">{m.label}</span>
                            <div className="d-metric-icon" style={{ background: m.bg }}>
                                <m.icon size={14} color={m.accent} strokeWidth={2} />
                            </div>
                        </div>
                        <div className="d-metric-value">
                            <AnimatedNumber value={m.rawValue} formatter={m.formatter} duration={1200 + i * 150} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="d-insights-row" style={{ animation: 'd-fadein 0.6s ease 0.25s both', gridTemplateColumns: 'repeat(2, 1fr)', display: 'grid', gap: '16px' }}>
                {startups.map((startup: any) => (
                    <div key={startup.id} className="d-performer-card" onClick={() => navigate('/company/updates')}>
                        <div className="d-perf-head">
                            <div className="d-perf-icon" style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
                                <Building2 size={16} color="#d4a843" strokeWidth={2} />
                            </div>
                            <span className="d-perf-label">Active</span>
                        </div>
                        <h4 className="d-perf-name">{startup.name}</h4>
                        <p className="d-perf-sector">{startup.industry}</p>
                        <div className="d-perf-metrics">
                            <div className="d-perf-metric">
                                <span className="d-perf-metric-lbl">Latest Update</span>
                                <span className="d-perf-metric-val" style={{ color: '#60A5FA', fontSize: '13px', paddingTop: '2px' }}>
                                    <Calendar size={12} strokeWidth={2.5} style={{ marginRight: '4px' }} />
                                    {startup.latestUpdate ? startup.latestUpdate.month : 'None yet'}
                                </span>
                            </div>
                            <div className="d-perf-metric">
                                <span className="d-perf-metric-lbl">Runway</span>
                                <span className="d-perf-metric-val" style={{ fontSize: '13px', paddingTop: '2px' }}>
                                    {startup.latestUpdate?.runwayMonths ? `${startup.latestUpdate.runwayMonths} months` : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(212,168,67,0.1)', display: 'flex', gap: '8px' }}>
                            <button className="d-btn-primary" style={{ padding: '7px 14px', fontSize: '12.5px', flex: 1, justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); navigate('/company/updates/new'); }}>
                                Submit Update
                            </button>
                        </div>
                    </div>
                ))}
                {startups.length === 0 && (
                    <div className="d-empty" style={{ gridColumn: 'span 2', minHeight: '300px', border: '1px dashed rgba(212,168,67,0.2)', borderRadius: '16px', background: 'rgba(10,22,40,0.55)' }}>
                        <div className="d-empty-icon">
                            <Building2 size={34} color="#d4a843" strokeWidth={1.5} />
                        </div>
                        <h2 className="d-empty-title" style={{ fontSize: '18px' }}>No companies found</h2>
                        <p className="d-empty-sub" style={{ fontSize: '13px' }}>You haven't been assigned to any companies yet. Contact your investor for access or accept a pending invite above.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const DASHBOARD_CSS = `
.d-root {
  font-family: var(--font-body, 'Inter', sans-serif);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: d-fadein 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
}
@keyframes d-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.d-shimmer { background: linear-gradient(90deg, rgba(10,22,40,0.8) 25%, rgba(15,29,50,0.8) 50%, rgba(10,22,40,0.8) 75%); background-size: 200% 100%; animation: d-shimmer 1.8s ease-in-out infinite; border: 1px solid rgba(212,168,67,0.06); border-radius: 16px; }
@keyframes d-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.d-page-header { display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; background: rgba(6,13,25,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 20px 0 16px; margin-top: -20px; border-bottom: 1px solid rgba(212,168,67,0.06); }

.d-btn-primary { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: linear-gradient(135deg, #d4a843, #e8c468); border: none; border-radius: 10px; font-size: 13.5px; font-weight: 600; color: #060d19; cursor: pointer; font-family: var(--font-body, 'Inter', sans-serif); transition: all 0.25s var(--ease-out); box-shadow: 0 2px 14px rgba(212,168,67,0.25); letter-spacing: 0.01em; position: relative; overflow: hidden; }
.d-btn-primary::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%); opacity: 0; transition: opacity 0.2s; }
.d-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(212,168,67,0.35); }
.d-btn-primary:hover::before { opacity: 1; }
.d-btn-decline:hover { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.3) !important; }
.d-btn-accept:hover { background: rgba(74,222,128,0.15) !important; border-color: rgba(74,222,128,0.3) !important; }

.d-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 1200px) { .d-metric-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px) { .d-metric-grid { grid-template-columns: repeat(1, 1fr); } }

.d-metric-card {
  background: rgba(10,22,40,0.55); border: 1px solid rgba(212,168,67,0.08); border-radius: 16px; padding: 18px 18px 16px;
  transition: all 0.3s var(--ease-out); cursor: default;
  opacity: 0; animation: d-fadein 0.5s var(--ease-out) forwards;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  position: relative; overflow: hidden;
}
.d-metric-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%); pointer-events: none; border-radius: inherit; }
.d-metric-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 24px rgba(212,168,67,0.06); transform: translateY(-3px); border-color: rgba(212,168,67,0.18); }
.d-metric-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.d-metric-label { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 9.5px; font-weight: 500; color: #3d4f68; letter-spacing: 0.08em; text-transform: uppercase; }
.d-metric-icon { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
.d-metric-value { font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size: 24px; font-weight: 800; color: var(--cream, #f0e6d0); letter-spacing: -0.02em; margin-bottom: 6px; }

.d-bottom-row { display: grid; grid-template-columns: 1fr; gap: 16px; }
.d-alerts-panel { background: rgba(10,22,40,0.55); border: 1px solid rgba(212,168,67,0.08); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.d-alerts-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.d-alerts-icon-wrap { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.d-alerts-count { font-size: 12px; margin-top: 2px; font-weight: 500; }
.d-alerts-list { display: flex; flex-direction: column; gap: 10px; }
.d-alert-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: rgba(255,255,255,0.015); border: 1px solid rgba(212,168,67,0.05); border-radius: 11px; transition: all 0.2s; }
.d-alert-item:hover { background: rgba(212,168,67,0.03); border-color: rgba(212,168,67,0.1); }
.d-alert-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.d-alert-title { font-size: 12px; font-weight: 600; margin-bottom: 3px; text-transform: capitalize; }
.d-alert-msg { font-size: 11.5px; color: #3d4f68; line-height: 1.5; }

.d-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; text-align: center; padding: 40px; }
.d-empty-icon { width: 72px; height: 72px; border-radius: 18px; background: rgba(212,168,67,0.06); border: 2px dashed rgba(212,168,67,0.22); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.d-empty-title { font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size: 24px; font-weight: 800; color: var(--cream, #f0e6d0); margin-bottom: 8px; letter-spacing: -0.02em; }
.d-empty-sub { font-size: 15px; color: #3d4f68; margin-bottom: 24px; max-width: 340px; line-height: 1.6; }

.d-insights-row { display: grid; gap: 16px; }
@media (max-width: 700px) { .d-insights-row { grid-template-columns: 1fr !important; } }

.d-performer-card {
  background: rgba(10,22,40,0.55); border: 1px solid rgba(212,168,67,0.08); border-radius: 16px; padding: 20px;
  cursor: pointer; transition: all 0.3s var(--ease-out); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  position: relative; overflow: hidden;
}
.d-performer-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%); pointer-events: none; border-radius: inherit; }
.d-performer-card:hover { border-color: rgba(212,168,67,0.2); transform: translateY(-3px); box-shadow: 0 6px 28px rgba(0,0,0,0.35), 0 0 20px rgba(212,168,67,0.05); }
.d-perf-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; position: relative; z-index: 1; }
.d-perf-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.d-perf-label { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #3d4f68; }
.d-perf-name { font-family: var(--font-body, 'Inter', sans-serif); font-size: 17px; font-weight: 700; color: var(--cream, #f0e6d0); margin-bottom: 3px; position: relative; z-index: 1; }
.d-perf-sector { font-size: 12px; color: #3d4f68; margin-bottom: 14px; position: relative; z-index: 1; }
.d-perf-metrics { display: flex; gap: 20px; position: relative; z-index: 1; }
.d-perf-metric { display: flex; flex-direction: column; gap: 3px; }
.d-perf-metric-lbl { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 9px; font-weight: 500; color: #2d3a4f; letter-spacing: 0.08em; text-transform: uppercase; }
.d-perf-metric-val { font-size: 15px; font-weight: 700; color: var(--cream, #f0e6d0); display: flex; align-items: center; gap: 3px; }
`;
