import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    AlertTriangle, TrendingUp, Briefcase, DollarSign,
    Target, Plus, ArrowUpRight, ArrowDownRight, Activity,
    CheckCircle2, Rocket, ChevronRight, Award, AlertOctagon,
    FileText, Clock
} from 'lucide-react';
import { dashboardAPI, alertsAPI } from '../services/api';
import { formatCurrencyCompact, formatMOIC, formatPercent, formatDate, formatTVPI, paiseToRupees } from '../utils/formatters';

// ── Animated Number Component ──────────────────────────────
const AnimatedNumber = ({ value, formatter = (v: number) => String(v), duration = 1200 }: { value: number, formatter?: (v: number) => string, duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            // easeOutQuart
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

const SECTOR_COLORS = ['#d4a843', '#60A5FA', '#A78BFA', '#FB923C', '#F87171', '#4ADE80'];

// ── Custom Tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0F1829', border: '1px solid rgba(197,164,84,0.2)', borderRadius: 10,
            padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
        }}>
            <p style={{ fontSize: 10, color: '#3d4f68', marginBottom: 4, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e6d0' }}>{payload[0]?.value != null ? formatCurrencyCompact(payload[0].value) : '—'}</p>
        </div>
    );
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const [activePeriod, setActivePeriod] = useState('ALL');

    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await dashboardAPI.get();
            return res.data.data;
        },
    });

    const { data: alerts } = useQuery({
        queryKey: ['unreadAlerts'],
        queryFn: async () => {
            const res = await alertsAPI.getAll(false);
            return res.data.data;
        },
    });

    const redAlerts = alerts?.filter((a: { severity: string; isRead: boolean }) => a.severity === 'RED' && !a.isRead) || [];
    const yellowAlerts = alerts?.filter((a: { severity: string; isRead: boolean }) => a.severity === 'YELLOW' && !a.isRead) || [];
    const allUnreadAlerts = [...redAlerts, ...yellowAlerts].slice(0, 3);

    // ── Loading skeleton ────────────────────────────────────
    if (isLoading) {
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
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="d-shimmer" style={{ height: 110, borderRadius: 14 }} />
                        ))}
                    </div>
                    <div className="d-charts-row">
                        <div className="d-shimmer" style={{ height: 340, borderRadius: 14, gridColumn: 'span 2' }} />
                        <div className="d-shimmer" style={{ height: 340, borderRadius: 14 }} />
                    </div>
                </div>
            </>
        );
    }

    // ── Empty state ─────────────────────────────────────────
    if (!dashboard || dashboard.startupMetrics.length === 0) {
        return (
            <>
                <style>{DASHBOARD_CSS}</style>
                <div className="d-root">
                    <div className="d-empty">
                        <div className="d-empty-icon">
                            <Briefcase size={34} color="#d4a843" strokeWidth={1.5} />
                        </div>
                        <h2 className="d-empty-title">Your portfolio is empty</h2>
                        <p className="d-empty-sub">Add your first investment to get started building your portfolio.</p>
                        <button title="Go to portfolio" onClick={() => navigate('/portfolio')} className="d-btn-primary">
                            <Plus size={16} strokeWidth={2.5} />
                            Add First Investment
                        </button>
                    </div>
                </div>
            </>
        );
    }

    const d = dashboard;

    const metrics = [
        { label: 'Total Invested', rawValue: paiseToRupees(d.totalInvested), formatter: formatCurrencyCompact, icon: DollarSign, accent: '#60A5FA', bg: 'rgba(96,165,250,0.1)', change: '+12.4%', up: true },
        { label: 'Current Value', rawValue: paiseToRupees(d.currentPortfolioValue), formatter: formatCurrencyCompact, icon: TrendingUp, accent: '#4ADE80', bg: 'rgba(74,222,128,0.1)', change: '+24.8%', up: true },
        { label: 'Portfolio IRR', rawValue: d.portfolioXIRR || 0, formatter: formatPercent, icon: Activity, accent: '#d4a843', bg: 'rgba(197,164,84,0.1)', change: d.portfolioXIRR > 0 ? '+2.1%' : '—', up: d.portfolioXIRR > 0 },
        { label: 'MOIC', rawValue: d.portfolioMOIC, formatter: formatMOIC, icon: Target, accent: '#A78BFA', bg: 'rgba(167,139,250,0.1)', change: d.portfolioMOIC >= 1 ? `${formatMOIC(d.portfolioMOIC)}` : '—', up: d.portfolioMOIC >= 1 },
        { label: 'TVPI', rawValue: d.portfolioTVPI || 0, formatter: formatTVPI, icon: Target, accent: '#FB923C', bg: 'rgba(251,146,60,0.1)', change: (d.portfolioTVPI || 0) >= 1 ? `${formatTVPI(d.portfolioTVPI)}` : '—', up: (d.portfolioTVPI || 0) >= 1 },
        { label: 'Active Startups', rawValue: d.activeCount, formatter: (v: number) => String(Math.round(v)), icon: Rocket, accent: '#4ADE80', bg: 'rgba(74,222,128,0.1)', change: null, up: true },
        { label: 'Exits', rawValue: d.exitedCount, formatter: (v: number) => String(Math.round(v)), icon: CheckCircle2, accent: '#60A5FA', bg: 'rgba(96,165,250,0.1)', change: null, up: true },
    ];

    const sectorData = d.sectorAllocation.map((s: { sector: string; invested: number }) => ({
        name: s.sector, value: paiseToRupees(s.invested),
    }));
    const totalSectorValue = sectorData.reduce((sum: number, s: { value: number }) => sum + s.value, 0);
    const topSector = sectorData.length > 0
        ? sectorData.reduce((max: { value: number }, s: { value: number }) => s.value > max.value ? s : max, sectorData[0])
        : null;
    const topSectorPct = topSector && totalSectorValue > 0
        ? Math.round((topSector.value / totalSectorValue) * 100) : 0;

    const chartData = d.startupMetrics.map((s: { name: string; currentValue: number }) => ({
        name: s.name, value: paiseToRupees(s.currentValue),
    }));

    return (
        <>
            <style>{DASHBOARD_CSS}</style>
            <div className="d-root">

                {/* ── PAGE HEADER ─────────────────────────────── */}
                <div className="d-page-header">
                    <div>
                        <h1 className="d-page-title">Portfolio Overview</h1>
                        <p className="d-page-sub">Last updated · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="d-header-actions">
                        {redAlerts.length > 0 && (
                            <button title="View critical alerts" className="d-alert-badge" onClick={() => navigate('/alerts')}>
                                <AlertTriangle size={13} strokeWidth={2.5} />
                                {redAlerts.length} critical alert{redAlerts.length !== 1 ? 's' : ''}
                            </button>
                        )}
                        <button title="Add a new investment" className="d-btn-primary" onClick={() => navigate('/portfolio')}>
                            <Plus size={15} strokeWidth={2.5} /> New Investment
                        </button>
                    </div>
                </div>

                {/* ── METRIC CARDS ────────────────────────────── */}
                <div className="d-metric-grid">
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
                            {m.change && (
                                <div className="d-metric-change" style={{ color: m.up ? '#4ADE80' : '#F87171' }}>
                                    {m.up ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
                                    {m.change}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── CHARTS ROW ──────────────────────────────── */}
                <div className="d-charts-row" style={{ animation: 'd-fadein 0.6s ease 0.2s both' }}>
                    {/* Portfolio Growth */}
                    <div className="d-card d-chart-main">
                        <div className="d-card-head">
                            <div>
                                <h3 className="d-card-title">Portfolio Growth</h3>
                                <p className="d-card-sub">Net Asset Value across portfolio companies</p>
                            </div>
                            <div className="d-period-toggle">
                                {['1Y', '3Y', 'ALL'].map(p => (
                                    <button key={p} title={`Show ${p} data`} className={`d-period-btn ${activePeriod === p ? 'active' : ''}`}
                                        onClick={() => setActivePeriod(p)}>{p}</button>
                                ))}
                            </div>
                        </div>
                        <div className="d-chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#d4a843" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#d4a843" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#3d4f68', fontSize: 11, fontFamily: "var(--font-body, 'Inter', sans-serif)" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#3d4f68', fontSize: 11, fontFamily: "var(--font-body, 'Inter', sans-serif)" }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="value" stroke="#d4a843" fill="url(#dGrad)" strokeWidth={2} dot={{ fill: '#d4a843', r: 3, stroke: '#060d19', strokeWidth: 2 }} activeDot={{ fill: '#d4a843', r: 5, stroke: '#060d19', strokeWidth: 2 }} name="Portfolio Value" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sector Donut */}
                    <div className="d-card d-chart-side">
                        <div className="d-card-head">
                            <div>
                                <h3 className="d-card-title">Sector Allocation</h3>
                                <p className="d-card-sub">Distribution by capital deployed</p>
                            </div>
                        </div>
                        <div className="d-donut-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={sectorData} cx="50%" cy="50%" innerRadius={58} outerRadius={82}
                                        dataKey="value" stroke="#060d19" strokeWidth={3} paddingAngle={2}>
                                        {sectorData.map((_: unknown, i: number) => (
                                            <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                        contentStyle={{ background: '#0F1829', border: '1px solid rgba(197,164,84,0.2)', borderRadius: 10, fontSize: 13, fontFamily: "var(--font-body, 'Inter', sans-serif)", padding: '9px 13px', color: '#f0e6d0' }}
                                        itemStyle={{ color: '#f0e6d0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {topSector && (
                                <div className="d-donut-label">
                                    <span className="d-donut-lbl-top">Top Sector</span>
                                    <span className="d-donut-lbl-name">{topSector.name}</span>
                                    <span className="d-donut-lbl-pct">{topSectorPct}%</span>
                                </div>
                            )}
                        </div>
                        <div className="d-legend">
                            {d.sectorAllocation.map((s: { sector: string; invested: number }, i: number) => {
                                const pct = totalSectorValue > 0 ? Math.round((paiseToRupees(s.invested) / totalSectorValue) * 100) : 0;
                                return (
                                    <div key={s.sector} className="d-legend-item">
                                        <span className="d-legend-dot" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                                        <span className="d-legend-name">{s.sector}</span>
                                        <span className="d-legend-pct">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── BEST/WORST + ACTIVITY ROW ─────────────── */}
                <div className="d-insights-row" style={{ animation: 'd-fadein 0.6s ease 0.25s both' }}>
                    {/* Best Performer */}
                    {d.bestPerformer && (
                        <div className="d-performer-card d-performer-best" onClick={() => navigate(`/portfolio/${d.bestPerformer.startupId}`)}>
                            <div className="d-perf-head">
                                <div className="d-perf-icon" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                                    <Award size={16} color="#4ADE80" strokeWidth={2} />
                                </div>
                                <span className="d-perf-label">Best Performer</span>
                            </div>
                            <h4 className="d-perf-name">{d.bestPerformer.name}</h4>
                            <p className="d-perf-sector">{d.bestPerformer.sector}</p>
                            <div className="d-perf-metrics">
                                <div className="d-perf-metric">
                                    <span className="d-perf-metric-lbl">MOIC</span>
                                    <span className="d-perf-metric-val" style={{ color: '#4ADE80' }}>
                                        <ArrowUpRight size={12} strokeWidth={2.5} />
                                        {formatMOIC(d.bestPerformer.moic)}
                                    </span>
                                </div>
                                <div className="d-perf-metric">
                                    <span className="d-perf-metric-lbl">Value</span>
                                    <span className="d-perf-metric-val">{formatCurrencyCompact(paiseToRupees(d.bestPerformer.currentValue))}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Worst Performer */}
                    {d.worstPerformer && (
                        <div className="d-performer-card d-performer-worst" onClick={() => navigate(`/portfolio/${d.worstPerformer.startupId}`)}>
                            <div className="d-perf-head">
                                <div className="d-perf-icon" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                    <AlertOctagon size={16} color="#F87171" strokeWidth={2} />
                                </div>
                                <span className="d-perf-label">Needs Attention</span>
                            </div>
                            <h4 className="d-perf-name">{d.worstPerformer.name}</h4>
                            <p className="d-perf-sector">{d.worstPerformer.sector}</p>
                            <div className="d-perf-metrics">
                                <div className="d-perf-metric">
                                    <span className="d-perf-metric-lbl">MOIC</span>
                                    <span className="d-perf-metric-val" style={{ color: d.worstPerformer.moic < 1 ? '#F87171' : '#FBBF24' }}>
                                        {d.worstPerformer.moic < 1 && <ArrowDownRight size={12} strokeWidth={2.5} />}
                                        {formatMOIC(d.worstPerformer.moic)}
                                    </span>
                                </div>
                                <div className="d-perf-metric">
                                    <span className="d-perf-metric-lbl">Invested</span>
                                    <span className="d-perf-metric-val">{formatCurrencyCompact(paiseToRupees(d.worstPerformer.invested))}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="d-card d-activity-card">
                        <div className="d-card-head" style={{ padding: '18px 22px 14px' }}>
                            <div>
                                <h3 className="d-card-title">Recent Activity</h3>
                                <p className="d-card-sub">Latest portfolio events</p>
                            </div>
                        </div>
                        <div className="d-activity-list">
                            {d.recentActivity && d.recentActivity.length > 0 ? (
                                d.recentActivity.map((a: { type: string; date: string; description: string; startupName: string }, i: number) => {
                                    const iconMap: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
                                        update: { icon: FileText, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
                                        investment: { icon: DollarSign, color: '#d4a843', bg: 'rgba(197,164,84,0.1)' },
                                        exit: { icon: CheckCircle2, color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
                                        document: { icon: FileText, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
                                    };
                                    const config = iconMap[a.type] || iconMap.update;
                                    const Icon = config.icon;
                                    const timeAgo = getTimeAgo(a.date);
                                    return (
                                        <div key={i} className="d-activity-item">
                                            <div className="d-activity-icon" style={{ background: config.bg }}>
                                                <Icon size={13} color={config.color} strokeWidth={2} />
                                            </div>
                                            <div className="d-activity-body">
                                                <p className="d-activity-desc">
                                                    <strong>{a.startupName}</strong> — {a.description}
                                                </p>
                                                <p className="d-activity-time" title={formatDate(a.date)}>
                                                    <Clock size={10} strokeWidth={2} /> {timeAgo} • {formatDate(a.date)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="d-activity-empty">
                                    <Activity size={20} color="#3d4f68" strokeWidth={1.5} />
                                    <p>No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── BOTTOM ROW ──────────────────────────────── */}
                <div className="d-bottom-row" style={{ animation: 'd-fadein 0.6s ease 0.3s both' }}>
                    {/* Risk Alerts */}
                    <div className="d-alerts-panel">
                        <div className="d-alerts-head">
                            <div className="d-alerts-icon-wrap">
                                <AlertTriangle size={16} color="#F87171" strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="d-card-title">Risk Alerts</h3>
                                <p className="d-alerts-count" style={{ color: redAlerts.length > 0 ? '#F87171' : '#4ADE80' }}>
                                    {redAlerts.length + yellowAlerts.length > 0
                                        ? `${redAlerts.length + yellowAlerts.length} item${redAlerts.length + yellowAlerts.length !== 1 ? 's' : ''} need attention`
                                        : 'All clear — no active alerts'}
                                </p>
                            </div>
                        </div>

                        {allUnreadAlerts.length > 0 ? (
                            <div className="d-alerts-list">
                                {allUnreadAlerts.map((alert: { id: string; severity: string; alertType?: string; startupId?: { name: string }; message: string }) => (
                                    <div key={alert.id} className="d-alert-item">
                                        <span className="d-alert-dot" style={{ background: alert.severity === 'RED' ? '#F87171' : '#FBBF24' }} />
                                        <div className="d-alert-body">
                                            <p className="d-alert-title" style={{ color: alert.severity === 'RED' ? '#FCA5A5' : '#FDE68A' }}>
                                                {alert.alertType?.replace(/_/g, ' ')} · {alert.startupId?.name || 'Unknown'}
                                            </p>
                                            <p className="d-alert-msg">{alert.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="d-alerts-empty">
                                <CheckCircle2 size={28} color="#4ADE80" strokeWidth={1.5} />
                                <p>Portfolio looks healthy</p>
                            </div>
                        )}

                        <button title="View all risk alerts" className="d-alerts-cta" onClick={() => navigate('/alerts')}>
                            View all risk activity <ChevronRight size={13} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Portfolio Table */}
                    <div className="d-card d-table-card">
                        <div className="d-card-head" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(197,164,84,0.1)' }}>
                            <div>
                                <h3 className="d-card-title">Portfolio Companies</h3>
                                <p className="d-card-sub">Top holdings by current value</p>
                            </div>
                            <button title="View full portfolio" className="d-view-all" onClick={() => navigate('/portfolio')}>
                                View all <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="d-table">
                                <thead>
                                    <tr>
                                        <th>Company</th>
                                        <th>Invested</th>
                                        <th>Current Value</th>
                                        <th>MOIC</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.startupMetrics.slice(0, 5).map((s: { startupId: string; name: string; sector: string; invested: number; currentValue: number; moic: number; status: string }) => (
                                        <tr key={s.startupId} className="d-table-row" onClick={() => navigate(`/portfolio/${s.startupId}`)}>
                                            <td>
                                                <div className="d-company-cell">
                                                    <div className="d-company-avatar" style={{
                                                        background: `hsla(${s.name.charCodeAt(0) * 10}, 50%, 50%, 0.15)`,
                                                        color: `hsl(${s.name.charCodeAt(0) * 10}, 50%, 65%)`,
                                                    }}>
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="d-company-name">{s.name}</p>
                                                        <p className="d-company-sector">{s.sector}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="d-mono d-col-dim">{formatCurrencyCompact(paiseToRupees(s.invested))}</td>
                                            <td className="d-mono d-col-strong">{formatCurrencyCompact(paiseToRupees(s.currentValue))}</td>
                                            <td>
                                                <span className="d-mono d-moic" style={{
                                                    color: s.moic >= 2 ? '#4ADE80' : s.moic >= 1 ? '#60A5FA' : '#F87171',
                                                    background: s.moic >= 2 ? 'rgba(74,222,128,0.1)' : s.moic >= 1 ? 'rgba(96,165,250,0.1)' : 'rgba(248,113,113,0.1)',
                                                }}>
                                                    {formatMOIC(s.moic)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="d-status-badge" style={{
                                                    background: s.status === 'active' ? 'rgba(74,222,128,0.1)' : s.status === 'exited' ? 'rgba(255,255,255,0.05)' : 'rgba(248,113,113,0.1)',
                                                    color: s.status === 'active' ? '#4ADE80' : s.status === 'exited' ? '#6b7a94' : '#F87171',
                                                    border: `1px solid ${s.status === 'active' ? 'rgba(74,222,128,0.2)' : s.status === 'exited' ? 'rgba(255,255,255,0.1)' : 'rgba(248,113,113,0.2)'}`,
                                                }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 5 }} />
                                                    {s.status === 'written_off' ? 'Written Off' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function getTimeAgo(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (isNaN(diff)) return '—';

    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

// ── All styles ────────────────────────────────────────────────────────────────
const DASHBOARD_CSS = `
.d-root {
  font-family: var(--font-body, 'Inter', sans-serif);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: d-fadein 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
}
@keyframes d-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

/* SHIMMER */
.d-shimmer { background: linear-gradient(90deg, rgba(10,22,40,0.8) 25%, rgba(15,29,50,0.8) 50%, rgba(10,22,40,0.8) 75%); background-size: 200% 100%; animation: d-shimmer 1.8s ease-in-out infinite; border: 1px solid rgba(212,168,67,0.06); border-radius:16px; }
@keyframes d-shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }

/* PAGE HEADER */
.d-page-header { display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:40; background:rgba(6,13,25,0.88); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); padding:20px 0 16px; margin-top:-20px; border-bottom:1px solid rgba(212,168,67,0.06); }
.d-page-title { font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size:24px; font-weight:800; color:var(--cream, #f0e6d0); letter-spacing:-0.02em; margin-bottom:3px; }
.d-page-sub { font-size:11px; color:#3d4f68; font-family:var(--font-mono, 'JetBrains Mono', monospace); letter-spacing:0.04em; }
.d-header-actions { display:flex; align-items:center; gap:10px; }
.d-alert-badge { display:flex; align-items:center; gap:6px; padding:7px 13px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.16); border-radius:10px; font-size:12.5px; font-weight:500; color:#f87171; cursor:pointer; transition:all 0.2s; font-family:var(--font-body, 'Inter', sans-serif); }
.d-alert-badge:hover { background:rgba(248,113,113,0.14); transform:translateY(-1px); }
.d-btn-primary { display:flex; align-items:center; gap:6px; padding:9px 18px; background:linear-gradient(135deg, #d4a843, #e8c468); border:none; border-radius:10px; font-size:13.5px; font-weight:600; color:#060d19; cursor:pointer; font-family:var(--font-body, 'Inter', sans-serif); transition:all 0.25s var(--ease-out); box-shadow:0 2px 14px rgba(212,168,67,0.25); letter-spacing:0.01em; position:relative; overflow:hidden; }
.d-btn-primary::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%); opacity:0; transition:opacity 0.2s; }
.d-btn-primary:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(212,168,67,0.35); }
.d-btn-primary:hover::before { opacity:1; }

/* METRIC GRID */
.d-metric-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
@media (max-width:1200px) { .d-metric-grid { grid-template-columns:repeat(3,1fr); } }
@media (max-width:700px) { .d-metric-grid { grid-template-columns:repeat(2,1fr); } }

.d-metric-card {
  background:rgba(10,22,40,0.55); border:1px solid rgba(212,168,67,0.08); border-radius:16px; padding:18px 18px 16px;
  transition:all 0.3s var(--ease-out, cubic-bezier(0.16,1,0.3,1)); cursor:default;
  opacity:0; animation:d-fadein 0.5s var(--ease-out) forwards;
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  position:relative; overflow:hidden;
}
.d-metric-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%); pointer-events:none; border-radius:inherit; }
.d-metric-card:hover { box-shadow:0 4px 24px rgba(0,0,0,0.35), 0 0 24px rgba(212,168,67,0.06); transform:translateY(-3px); border-color:rgba(212,168,67,0.18); }
.d-metric-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.d-metric-label { font-family:var(--font-mono, 'JetBrains Mono', monospace); font-size:9.5px; font-weight:500; color:#3d4f68; letter-spacing:0.08em; text-transform:uppercase; }
.d-metric-icon { width:28px; height:28px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
.d-metric-value { font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size:24px; font-weight:800; color:var(--cream, #f0e6d0); letter-spacing:-0.02em; margin-bottom:6px; }
.d-metric-change { display:flex; align-items:center; gap:3px; font-size:13px; font-weight:600; font-family:var(--font-body, 'Inter', sans-serif); }

/* CHARTS ROW */
.d-charts-row { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
@media (max-width:1000px) { .d-charts-row { grid-template-columns:1fr; } }

.d-card { background:rgba(10,22,40,0.55); border:1px solid rgba(212,168,67,0.08); border-radius:16px; overflow:hidden; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); position:relative; }
.d-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%); pointer-events:none; border-radius:inherit; }
.d-card-head { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 22px 18px; position:relative; z-index:1; }
.d-card-title { font-family:var(--font-body, 'Inter', sans-serif); font-size:15px; font-weight:600; color:var(--cream, #f0e6d0); margin-bottom:3px; }
.d-card-sub { font-size:11.5px; color:#3d4f68; font-weight:400; }

/* Growth chart */
.d-chart-wrap { height:262px; padding:0 18px 18px; position:relative; z-index:1; }
.d-period-toggle { display:flex; align-items:center; gap:2px; background:rgba(255,255,255,0.03); border:1px solid rgba(212,168,67,0.08); border-radius:9px; padding:3px; }
.d-period-btn { padding:4px 10px; border-radius:7px; font-size:11.5px; font-weight:500; color:#3d4f68; background:transparent; border:none; cursor:pointer; transition:all 0.2s var(--ease-smooth); letter-spacing:0.02em; font-family:var(--font-body, 'Inter', sans-serif); }
.d-period-btn.active { background:rgba(212,168,67,0.12); color:#d4a843; font-weight:600; }

/* Sector donut */
.d-chart-side { display:flex; flex-direction:column; }
.d-donut-wrap { height:190px; position:relative; margin: 0 18px; z-index:1; }
.d-donut-label { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.d-donut-lbl-top { font-family:var(--font-mono, 'JetBrains Mono', monospace); font-size:9.5px; font-weight:500; color:#3d4f68; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:3px; }
.d-donut-lbl-name { font-family:var(--font-body, 'Inter', sans-serif); font-size:15px; font-weight:600; color:var(--cream, #f0e6d0); }
.d-donut-lbl-pct { font-size:14px; font-weight:600; color:#d4a843; margin-top: 2px;}
.d-legend { display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; padding:14px 20px 18px; border-top:1px solid rgba(212,168,67,0.06); margin-top:auto; position:relative; z-index:1; }
.d-legend-item { display:flex; align-items:center; gap:7px; }
.d-legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.d-legend-name { font-size:12px; color:#6b7a94; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.d-legend-pct { font-size:12px; color:#3d4f68; font-weight:600; }

/* BOTTOM ROW */
.d-bottom-row { display:grid; grid-template-columns:340px 1fr; gap:16px; }
@media (max-width:1000px) { .d-bottom-row { grid-template-columns:1fr; } }

/* Alerts panel */
.d-alerts-panel { background:rgba(10,22,40,0.55); border:1px solid rgba(212,168,67,0.08); border-radius:16px; padding:20px; display:flex; flex-direction:column; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
.d-alerts-head { display:flex; align-items:flex-start; gap:12px; margin-bottom:16px; }
.d-alerts-icon-wrap { width:34px; height:34px; border-radius:10px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.16); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.d-alerts-count { font-size:12px; margin-top:2px; font-weight:500; }
.d-alerts-list { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
.d-alert-item { display:flex; align-items:flex-start; gap:10px; padding:12px; background:rgba(255,255,255,0.015); border:1px solid rgba(212,168,67,0.05); border-radius:11px; transition:all 0.2s; }
.d-alert-item:hover { background:rgba(212,168,67,0.03); border-color:rgba(212,168,67,0.1); }
.d-alert-dot { width:7px; height:7px; border-radius:50%; margin-top:5px; flex-shrink:0; }
.d-alert-title { font-size:12px; font-weight:600; margin-bottom:3px; text-transform:capitalize; }
.d-alert-msg { font-size:11.5px; color:#3d4f68; line-height:1.5; }
.d-alerts-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px 0; }
.d-alerts-empty p { font-size:14px; color:#3d4f68; }
.d-alerts-cta { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:600; color:#d4a843; background:none; border:none; cursor:pointer; padding:0; margin-top:auto; transition:all 0.2s; font-family:var(--font-body, 'Inter', sans-serif); }
.d-alerts-cta:hover { opacity:0.7; }

/* Table card */
.d-view-all { display:flex; align-items:center; gap:4px; font-size:13px; font-weight:600; color:#d4a843; background:none; border:none; cursor:pointer; padding:0; font-family:var(--font-body, 'Inter', sans-serif); transition:all 0.2s; }
.d-view-all:hover { opacity:0.7; }
.d-table { width:100%; border-collapse:collapse; }
.d-table th { padding:12px 22px; text-align:left; font-size:9.5px; font-weight:500; color:#2d3a4f; letter-spacing:0.1em; text-transform:uppercase; white-space:nowrap; border-bottom:1px solid rgba(212,168,67,0.06); font-family:var(--font-mono, 'JetBrains Mono', monospace); }
.d-table-row { cursor:pointer; transition:all 0.15s; }
.d-table-row:hover { background:rgba(212,168,67,0.035); }
.d-table-row td { padding:14px 22px; border-bottom:1px solid rgba(212,168,67,0.04); vertical-align:middle; font-size: 13px; }
.d-table-row:last-child td { border-bottom:none; }
.d-company-cell { display:flex; align-items:center; gap:11px; }
.d-company-avatar { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; flex-shrink:0; }
.d-company-name { font-size:14px; font-weight:600; color:var(--cream, #f0e6d0); margin-bottom:2px; }
.d-company-sector { font-size:11.5px; color:#3d4f68; }
.d-mono { font-size:13px; font-weight:500;}
.d-col-dim { color:#3d4f68; }
.d-col-strong { color:var(--cream, #f0e6d0); font-weight:600; }
.d-moic { display:inline-block; padding:3px 9px; border-radius:7px; font-size:12px; font-weight:600; }
.d-status-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:500; white-space:nowrap; }

/* Empty state */
.d-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; text-align:center; }
.d-empty-icon { width:72px; height:72px; border-radius:18px; background:rgba(212,168,67,0.06); border:2px dashed rgba(212,168,67,0.22); display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
.d-empty-title { font-family:var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size:24px; font-weight:800; color:var(--cream, #f0e6d0); margin-bottom:8px; letter-spacing:-0.02em; }
.d-empty-sub { font-size:15px; color:#3d4f68; margin-bottom:24px; max-width:340px; line-height:1.6; }

/* INSIGHTS ROW (best/worst + activity) */
.d-insights-row { display:grid; grid-template-columns:1fr 1fr 2fr; gap:16px; }
@media (max-width:1200px) { .d-insights-row { grid-template-columns:1fr 1fr; } }
@media (max-width:700px) { .d-insights-row { grid-template-columns:1fr; } }

.d-performer-card {
  background:rgba(10,22,40,0.55); border:1px solid rgba(212,168,67,0.08); border-radius:16px; padding:20px;
  cursor:pointer; transition:all 0.3s var(--ease-out); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  position:relative; overflow:hidden;
}
.d-performer-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%); pointer-events:none; border-radius:inherit; }
.d-performer-card:hover { border-color:rgba(212,168,67,0.2); transform:translateY(-3px); box-shadow:0 6px 28px rgba(0,0,0,0.35), 0 0 20px rgba(212,168,67,0.05); }
.d-perf-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; position:relative; z-index:1; }
.d-perf-icon { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.d-perf-label { font-family:var(--font-mono, 'JetBrains Mono', monospace); font-size:9.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#3d4f68; }
.d-perf-name { font-family:var(--font-body, 'Inter', sans-serif); font-size:17px; font-weight:700; color:var(--cream, #f0e6d0); margin-bottom:3px; position:relative; z-index:1; }
.d-perf-sector { font-size:12px; color:#3d4f68; margin-bottom:14px; position:relative; z-index:1; }
.d-perf-metrics { display:flex; gap:20px; position:relative; z-index:1; }
.d-perf-metric { display:flex; flex-direction:column; gap:3px; }
.d-perf-metric-lbl { font-family:var(--font-mono, 'JetBrains Mono', monospace); font-size:9px; font-weight:500; color:#2d3a4f; letter-spacing:0.08em; text-transform:uppercase; }
.d-perf-metric-val { font-size:15px; font-weight:700; color:var(--cream, #f0e6d0); display:flex; align-items:center; gap:3px; }

.d-activity-card { display:flex; flex-direction:column; }
.d-activity-list { display:flex; flex-direction:column; padding:0 18px 14px; flex:1; position:relative; z-index:1; }
.d-activity-item { display:flex; align-items:flex-start; gap:12px; padding:11px 4px; border-bottom:1px solid rgba(212,168,67,0.05); transition:all 0.15s; }
.d-activity-item:hover { background:rgba(212,168,67,0.02); border-radius:8px; }
.d-activity-item:last-child { border-bottom:none; }
.d-activity-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.d-activity-desc { font-size:13px; color:var(--cream, #f0e6d0); line-height:1.5; }
.d-activity-desc strong { font-weight:600; }
.d-activity-time { font-size:10.5px; color:#2d3a4f; margin-top:3px; display:flex; align-items:center; gap:4px; }
.d-activity-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:30px 0; }
.d-activity-empty p { font-size:13px; color:#3d4f68; }
`;
