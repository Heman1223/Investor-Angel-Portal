import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, TrendingUp, Briefcase, DollarSign, Target, Plus, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { dashboardAPI, alertsAPI } from '../services/api';
import { formatCurrencyCompact, formatMOIC, formatPercent, paiseToRupees, getMOICColor, getIRRColor } from '../utils/formatters';

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#14b830', '#ef4444', '#8b5cf6', '#ec4899'];

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

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="card animate-shimmer h-[140px]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card animate-shimmer h-[380px] lg:col-span-2" />
                    <div className="card animate-shimmer h-[380px]" />
                </div>
            </div>
        );
    }

    if (!dashboard || dashboard.startupMetrics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-8" style={{ 
                    background: 'linear-gradient(135deg, rgba(20, 184, 48, 0.12) 0%, rgba(20, 184, 48, 0.06) 100%)',
                    border: '2px dashed rgba(20, 184, 48, 0.3)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <Briefcase size={40} style={{ color: '#14b830' }} strokeWidth={2} />
                </div>
                <h2 className="font-display text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Your portfolio is empty
                </h2>
                <p className="text-base mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                    Add your first investment to get started.
                </p>
                <button onClick={() => navigate('/portfolio')} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                    <Plus size={18} strokeWidth={2.5} /> Add First Investment
                </button>
            </div>
        );
    }

    const d = dashboard;
    const metrics = [
        { 
            label: 'Total Invested', 
            value: formatCurrencyCompact(paiseToRupees(d.totalInvested)), 
            icon: DollarSign, 
            color: '#3b82f6',
            bgColor: 'rgba(59, 130, 246, 0.12)',
            change: '+12.4%',
            isPositive: true
        },
        { 
            label: 'Portfolio Value', 
            value: formatCurrencyCompact(paiseToRupees(d.currentPortfolioValue)), 
            icon: TrendingUp, 
            color: '#14b830',
            bgColor: 'rgba(20, 184, 48, 0.12)',
            change: '+24.8%',
            isPositive: true
        },
        { 
            label: 'Portfolio MOIC', 
            value: formatMOIC(d.portfolioMOIC), 
            icon: Target, 
            color: d.portfolioMOIC >= 1 ? '#14b830' : '#ef4444',
            bgColor: d.portfolioMOIC >= 1 ? 'rgba(20, 184, 48, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            change: '1.81x',
            isPositive: d.portfolioMOIC >= 1
        },
        { 
            label: 'Portfolio XIRR', 
            value: formatPercent(d.portfolioXIRR), 
            icon: Activity, 
            color: d.portfolioXIRR && d.portfolioXIRR > 0 ? '#14b830' : '#ef4444',
            bgColor: d.portfolioXIRR && d.portfolioXIRR > 0 ? 'rgba(20, 184, 48, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            change: '+28.2%',
            isPositive: d.portfolioXIRR && d.portfolioXIRR > 0
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Portfolio Overview
                    </h1>
                    <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                        Real-time insights into your investment portfolio
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="badge badge-green" style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}>
                        <span className="badge-dot" style={{ background: '#14b830', width: '7px', height: '7px' }}></span>
                        LIVE
                    </span>
                </div>
            </div>

            {/* Alert Banner */}
            {redAlerts.length > 0 && (
                <div
                    className="flex items-center gap-4 px-6 py-5 rounded-xl border"
                    style={{ 
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.03) 100%)', 
                        borderColor: 'rgba(239, 68, 68, 0.25)',
                        boxShadow: 'var(--shadow-md)'
                    }}
                >
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.12)' }}>
                        <AlertTriangle size={20} style={{ color: '#ef4444' }} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <span className="text-base font-semibold" style={{ color: '#b91c1c' }}>
                            {redAlerts.length} critical alert{redAlerts.length > 1 ? 's' : ''} require immediate attention
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/alerts')}
                        className="btn btn-sm"
                        style={{ 
                            background: '#ef4444',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                            padding: '8px 18px',
                            fontSize: '14px'
                        }}
                    >
                        View Alerts
                    </button>
                </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div 
                        key={i} 
                        className="card card-hover" 
                        style={{ 
                            borderLeft: `4px solid ${m.color}`,
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 251, 250, 1) 100%)',
                            padding: '28px',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div className="flex items-start justify-between mb-5">
                            <div className="p-3 rounded-xl" style={{ 
                                background: m.bgColor,
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <m.icon size={22} style={{ color: m.color }} strokeWidth={2.5} />
                            </div>
                            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ 
                                color: m.isPositive ? '#15803d' : '#b91c1c'
                            }}>
                                {m.isPositive ? <ArrowUpRight size={16} strokeWidth={2.5} /> : <ArrowDownRight size={16} strokeWidth={2.5} />}
                                {m.change}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ 
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.1em'
                            }}>
                                {m.label}
                            </span>
                            <div className="font-mono text-3xl font-bold mt-2" style={{ 
                                color: m.color,
                                letterSpacing: '-0.02em'
                            }}>
                                {m.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub Stats */}
            <div className="flex gap-4 flex-wrap">
                <div className="badge badge-green" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600 }}>
                    <span className="badge-dot" style={{ background: '#14b830', width: '7px', height: '7px' }}></span>
                    Active: {d.activeCount}
                </div>
                <div className="badge badge-gray" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600 }}>
                    <span className="badge-dot" style={{ background: '#6b7280', width: '7px', height: '7px' }}></span>
                    Exited: {d.exitedCount}
                </div>
                <div className="badge badge-blue" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600 }}>
                    TVPI: {d.portfolioTVPI?.toFixed(2)}x
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Portfolio Growth Chart */}
                <div className="card lg:col-span-2" style={{ 
                    padding: '32px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                                Portfolio Growth
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                Investment vs Current Value comparison
                            </p>
                        </div>
                        <select className="select" style={{ 
                            width: 'auto', 
                            minWidth: '140px', 
                            padding: '8px 40px 8px 14px',
                            fontSize: '14px',
                            fontWeight: 500,
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <option>All Time</option>
                            <option>This Year</option>
                            <option>Last 6M</option>
                        </select>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer>
                            <AreaChart
                                data={d.startupMetrics.map((s: any) => ({
                                    name: s.name,
                                    invested: paiseToRupees(s.invested),
                                    currentValue: paiseToRupees(s.currentValue),
                                }))}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b830" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#14b830" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#8b949e', fontSize: 12, fontWeight: 500 }} 
                                    stroke="#eef1f4" 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fill: '#8b949e', fontSize: 12, fontWeight: 500 }} 
                                    stroke="#eef1f4" 
                                    tickFormatter={(v) => formatCurrencyCompact(v)}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white', 
                                        border: '1px solid #eef1f4',
                                        borderRadius: 10, 
                                        fontFamily: 'Inter', 
                                        fontSize: 13,
                                        fontWeight: 500,
                                        padding: '12px 16px',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}
                                    formatter={(value: number | undefined) => formatCurrencyCompact(value ?? 0)}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="invested" 
                                    stroke="#3b82f6" 
                                    fill="url(#colorInvested)" 
                                    strokeWidth={3}
                                    name="Invested"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="currentValue" 
                                    stroke="#14b830" 
                                    fill="url(#colorValue)" 
                                    strokeWidth={3}
                                    name="Current Value"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Allocation Donut */}
                <div className="card" style={{ 
                    padding: '32px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div className="mb-8">
                        <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            Sector Allocation
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Distribution by investment
                        </p>
                    </div>
                    <div className="h-[200px] mb-6">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={d.sectorAllocation.map((s: any) => ({
                                        name: s.sector,
                                        value: paiseToRupees(s.invested),
                                    }))}
                                    cx="50%" 
                                    cy="50%"
                                    innerRadius={55} 
                                    outerRadius={80}
                                    dataKey="value"
                                    stroke="white"
                                    strokeWidth={3}
                                >
                                    {d.sectorAllocation.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'white', 
                                        border: '1px solid #eef1f4',
                                        borderRadius: 10, 
                                        fontFamily: 'Inter', 
                                        fontSize: 13,
                                        fontWeight: 500,
                                        padding: '12px 16px',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}
                                    formatter={(value: number | undefined) => formatCurrencyCompact(value ?? 0)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                        {d.sectorAllocation.map((s: any, i: number) => (
                            <div key={s.sector} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-3.5 h-3.5 rounded" style={{ 
                                        background: CHART_COLORS[i % CHART_COLORS.length],
                                        boxShadow: 'var(--shadow-sm)'
                                    }} />
                                    <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                        {s.sector}
                                    </span>
                                </div>
                                <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {formatCurrencyCompact(paiseToRupees(s.invested))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Portfolio Companies Table */}
            <div className="card" style={{ padding: 0, boxShadow: 'var(--shadow-lg)' }}>
                <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                    <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Portfolio Companies
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {d.startupMetrics.length} companies in your portfolio
                    </p>
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ padding: '16px 32px' }}>Name</th>
                                <th style={{ padding: '16px 32px' }}>Sector</th>
                                <th style={{ padding: '16px 32px' }}>Stage</th>
                                <th style={{ padding: '16px 32px' }}>Invested</th>
                                <th style={{ padding: '16px 32px' }}>Current Value</th>
                                <th style={{ padding: '16px 32px' }}>MOIC</th>
                                <th style={{ padding: '16px 32px' }}>IRR</th>
                                <th style={{ padding: '16px 32px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.startupMetrics.map((s: any) => (
                                <tr 
                                    key={s.startupId} 
                                    className="cursor-pointer" 
                                    onClick={() => navigate(`/portfolio/${s.startupId}`)}
                                    style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                >
                                    <td className="font-semibold" style={{ 
                                        color: 'var(--color-text-primary)',
                                        padding: '18px 32px',
                                        fontSize: '15px'
                                    }}>
                                        {s.name}
                                    </td>
                                    <td style={{ 
                                        color: 'var(--color-text-secondary)',
                                        padding: '18px 32px',
                                        fontSize: '14px'
                                    }}>
                                        {s.sector}
                                    </td>
                                    <td style={{ padding: '18px 32px' }}>
                                        <span className="badge badge-blue" style={{ 
                                            fontSize: '12px', 
                                            padding: '5px 12px',
                                            fontWeight: 600
                                        }}>
                                            {s.stage}
                                        </span>
                                    </td>
                                    <td className="font-mono font-medium" style={{ 
                                        color: 'var(--color-text-secondary)',
                                        padding: '18px 32px',
                                        fontSize: '14px'
                                    }}>
                                        {formatCurrencyCompact(paiseToRupees(s.invested))}
                                    </td>
                                    <td className="font-mono font-bold" style={{ 
                                        color: 'var(--color-text-primary)',
                                        padding: '18px 32px',
                                        fontSize: '14px'
                                    }}>
                                        {formatCurrencyCompact(paiseToRupees(s.currentValue))}
                                    </td>
                                    <td className={`font-mono font-bold ${getMOICColor(s.moic)}`} style={{ 
                                        padding: '18px 32px',
                                        fontSize: '14px'
                                    }}>
                                        {formatMOIC(s.moic)}
                                    </td>
                                    <td className={`font-mono font-bold ${getIRRColor(s.xirr)}`} style={{ 
                                        padding: '18px 32px',
                                        fontSize: '14px'
                                    }}>
                                        {formatPercent(s.xirr)}
                                    </td>
                                    <td style={{ padding: '18px 32px' }}>
                                        <span className={`badge ${
                                            s.status === 'active' ? 'badge-green' :
                                            s.status === 'exited' ? 'badge-gray' :
                                            s.status === 'written_off' ? 'badge-red' : 'badge-yellow'
                                        }`} style={{ 
                                            fontSize: '12px', 
                                            padding: '5px 12px',
                                            fontWeight: 600
                                        }}>
                                            <span className="badge-dot" style={{ 
                                                background: s.status === 'active' ? '#14b830' : '#6b7280',
                                                width: '6px',
                                                height: '6px'
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
    );
}
