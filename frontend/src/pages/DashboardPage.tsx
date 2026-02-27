import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    AlertTriangle, TrendingUp, Briefcase, DollarSign,
    Target, Plus, ArrowUpRight, Activity, CheckCircle2, Rocket
} from 'lucide-react';
import { dashboardAPI, alertsAPI } from '../services/api';
import { formatCurrencyCompact, formatMOIC, formatPercent, paiseToRupees, getMOICColor } from '../utils/formatters';

const SECTOR_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#ec4899'];

export default function DashboardPage() {
    const navigate = useNavigate();

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

    const redAlerts = alerts?.filter((a: any) => a.severity === 'RED' && !a.isRead) || [];
    const yellowAlerts = alerts?.filter((a: any) => a.severity === 'YELLOW' && !a.isRead) || [];
    const allUnreadAlerts = [...redAlerts, ...yellowAlerts].slice(0, 3);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="card animate-shimmer h-[120px]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card animate-shimmer h-[360px] lg:col-span-2" />
                    <div className="card animate-shimmer h-[360px]" />
                </div>
            </div>
        );
    }

    if (!dashboard || dashboard.startupMetrics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{
                    background: 'var(--color-primary-50)',
                    border: '2px dashed var(--color-primary)',
                }}>
                    <Briefcase size={36} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Your portfolio is empty
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                    Add your first investment to get started.
                </p>
                <button onClick={() => navigate('/portfolio')} className="btn btn-primary">
                    <Plus size={18} /> Add First Investment
                </button>
            </div>
        );
    }

    const d = dashboard;

    const metrics = [
        {
            label: 'TOTAL INVESTED',
            value: formatCurrencyCompact(paiseToRupees(d.totalInvested)),
            icon: DollarSign,
            color: '#3b82f6',
            bgColor: '#dbeafe',
            change: '+12.4%',
            isPositive: true,
        },
        {
            label: 'CURRENT VALUE',
            value: formatCurrencyCompact(paiseToRupees(d.currentPortfolioValue)),
            icon: TrendingUp,
            color: '#22c55e',
            bgColor: '#dcfce7',
            change: '+24.8%',
            isPositive: true,
        },
        {
            label: 'IRR',
            value: formatPercent(d.portfolioXIRR),
            icon: Activity,
            color: '#f59e0b',
            bgColor: '#fef3c7',
            change: d.portfolioXIRR && d.portfolioXIRR > 0 ? '+2.1%' : '-',
            isPositive: d.portfolioXIRR && d.portfolioXIRR > 0,
        },
        {
            label: 'MOIC',
            value: formatMOIC(d.portfolioMOIC),
            icon: Target,
            color: '#8b5cf6',
            bgColor: '#f3e8ff',
            change: formatMOIC(d.portfolioMOIC),
            isPositive: d.portfolioMOIC >= 1,
        },
        {
            label: 'ACTIVE STARTUPS',
            value: String(d.activeCount),
            icon: Rocket,
            color: '#22c55e',
            bgColor: '#dcfce7',
            change: null,
            isPositive: true,
        },
        {
            label: 'EXITS',
            value: String(d.exitedCount),
            icon: CheckCircle2,
            color: '#3b82f6',
            bgColor: '#dbeafe',
            change: null,
            isPositive: true,
        },
    ];

    // Sector allocation data for donut
    const sectorData = d.sectorAllocation.map((s: any) => ({
        name: s.sector,
        value: paiseToRupees(s.invested),
    }));

    const topSector = sectorData.length > 0
        ? sectorData.reduce((max: any, s: any) => s.value > max.value ? s : max, sectorData[0])
        : null;

    const totalSectorValue = sectorData.reduce((sum: number, s: any) => sum + s.value, 0);
    const topSectorPct = topSector && totalSectorValue > 0
        ? Math.round((topSector.value / totalSectorValue) * 100)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 6 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.map((m, i) => (
                    <div key={i} className="card card-hover" style={{ padding: '20px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.08em',
                            }}>
                                {m.label}
                            </span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                                background: m.bgColor,
                            }}>
                                <m.icon size={14} style={{ color: m.color }} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="font-mono text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {m.value}
                        </div>
                        {m.change && (
                            <div className="flex items-center gap-1 text-xs font-semibold" style={{
                                color: m.isPositive ? '#16a34a' : '#dc2626',
                            }}>
                                <ArrowUpRight size={12} strokeWidth={2.5} />
                                {m.change}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Portfolio Growth Chart */}
                <div className="card lg:col-span-2" style={{ padding: '28px' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                Portfolio Growth
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                Net Asset Value over time (YoY)
                            </p>
                        </div>
                        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{
                            background: 'var(--color-bg-hover)',
                            border: '1px solid var(--color-border-light)',
                        }}>
                            {['1Y', '3Y', 'ALL'].map((period) => (
                                <button
                                    key={period}
                                    className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                                    style={{
                                        background: period === 'ALL' ? 'white' : 'transparent',
                                        color: period === 'ALL' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                        boxShadow: period === 'ALL' ? 'var(--shadow-xs)' : 'none',
                                    }}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer>
                            <AreaChart
                                data={d.startupMetrics.map((s: any) => ({
                                    name: s.name,
                                    value: paiseToRupees(s.currentValue),
                                }))}
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    stroke="#f1f5f9"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    stroke="#f1f5f9"
                                    tickFormatter={(v) => formatCurrencyCompact(v)}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 10,
                                        fontFamily: 'Inter',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        padding: '10px 14px',
                                        boxShadow: 'var(--shadow-lg)',
                                    }}
                                    formatter={(value: number | undefined) => formatCurrencyCompact(value ?? 0)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#22c55e"
                                    fill="url(#colorGrowth)"
                                    strokeWidth={2.5}
                                    dot={{ fill: '#22c55e', r: 3, stroke: 'white', strokeWidth: 2 }}
                                    activeDot={{ fill: '#22c55e', r: 5, stroke: 'white', strokeWidth: 2 }}
                                    name="Portfolio Value"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Allocation Donut */}
                <div className="card" style={{ padding: '28px' }}>
                    <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        Sector Allocation
                    </h3>
                    <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                        Distribution by investment
                    </p>
                    <div className="h-[200px] relative">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={sectorData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={58}
                                    outerRadius={82}
                                    dataKey="value"
                                    stroke="white"
                                    strokeWidth={3}
                                >
                                    {sectorData.map((_: any, i: number) => (
                                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 10,
                                        fontSize: 13,
                                        padding: '10px 14px',
                                        boxShadow: 'var(--shadow-lg)',
                                    }}
                                    formatter={(value: number | undefined) => formatCurrencyCompact(value ?? 0)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        {topSector && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                                    TOP SECTOR
                                </span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {topSector.name}
                                </span>
                                <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                                    {topSectorPct}%
                                </span>
                            </div>
                        )}
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {d.sectorAllocation.map((s: any, i: number) => {
                            const pct = totalSectorValue > 0 ? Math.round((paiseToRupees(s.invested) / totalSectorValue) * 100) : 0;
                            return (
                                <div key={s.sector} className="flex items-center gap-2 text-xs">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                                        background: SECTOR_COLORS[i % SECTOR_COLORS.length],
                                    }} />
                                    <span style={{ color: 'var(--color-text-secondary)' }}>
                                        {s.sector} ({pct}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Risk Alerts & Recent Updates Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Risk Alerts */}
                <div className="lg:col-span-2 rounded-xl p-5" style={{
                    background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
                    border: '1px solid #fecaca',
                }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ background: '#fecaca' }}>
                            <AlertTriangle size={18} style={{ color: '#ef4444' }} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                Risk Alerts
                            </h3>
                            <p className="text-xs" style={{ color: '#ef4444' }}>
                                Action required for {redAlerts.length + yellowAlerts.length} items
                            </p>
                        </div>
                    </div>

                    {allUnreadAlerts.length > 0 ? (
                        <div className="space-y-3">
                            {allUnreadAlerts.map((alert: any) => (
                                <div key={alert._id} className="p-3 rounded-lg" style={{
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    border: '1px solid #fecaca',
                                }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                                            background: alert.severity === 'RED' ? '#ef4444' : '#f59e0b',
                                        }}></span>
                                        <span className="text-sm font-semibold" style={{
                                            color: alert.severity === 'RED' ? '#b91c1c' : '#b45309',
                                        }}>
                                            {alert.alertType?.replace(/_/g, ' ')} — {alert.startupId?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    <p className="text-xs ml-4" style={{ color: 'var(--color-text-secondary)' }}>
                                        {alert.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No active risk alerts</p>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/alerts')}
                        className="mt-4 text-sm font-semibold transition-colors hover:underline"
                        style={{ color: '#ef4444' }}
                    >
                        View all risks →
                    </button>
                </div>

                {/* Portfolio Companies Quick View */}
                <div className="lg:col-span-3 card" style={{ padding: 0 }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            Portfolio Companies
                        </h3>
                        <button
                            onClick={() => navigate('/portfolio')}
                            className="text-xs font-semibold transition-colors hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th style={{ padding: '10px 20px', fontSize: '10px' }}>Name</th>
                                    <th style={{ padding: '10px 20px', fontSize: '10px' }}>Invested</th>
                                    <th style={{ padding: '10px 20px', fontSize: '10px' }}>Value</th>
                                    <th style={{ padding: '10px 20px', fontSize: '10px' }}>MOIC</th>
                                    <th style={{ padding: '10px 20px', fontSize: '10px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {d.startupMetrics.slice(0, 5).map((s: any) => (
                                    <tr
                                        key={s.startupId}
                                        className="cursor-pointer"
                                        onClick={() => navigate(`/portfolio/${s.startupId}`)}
                                    >
                                        <td style={{ padding: '10px 20px' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{
                                                    background: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 92%)`,
                                                    color: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 40%)`,
                                                }}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                        {s.name}
                                                    </p>
                                                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                                        {s.sector}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-mono text-sm" style={{ padding: '10px 20px', color: 'var(--color-text-secondary)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.invested))}
                                        </td>
                                        <td className="font-mono text-sm font-semibold" style={{ padding: '10px 20px', color: 'var(--color-text-primary)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.currentValue))}
                                        </td>
                                        <td className={`font-mono text-sm font-semibold ${getMOICColor(s.moic)}`} style={{ padding: '10px 20px' }}>
                                            {formatMOIC(s.moic)}
                                        </td>
                                        <td style={{ padding: '10px 20px' }}>
                                            <span className={`badge ${s.status === 'active' ? 'badge-green' :
                                                s.status === 'exited' ? 'badge-gray' :
                                                    s.status === 'written_off' ? 'badge-red' : 'badge-yellow'
                                                }`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                <span className="badge-dot" style={{
                                                    background: s.status === 'active' ? '#22c55e' :
                                                        s.status === 'exited' ? '#64748b' : '#ef4444',
                                                    width: '5px', height: '5px',
                                                }}></span>
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
    );
}
