import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitCompare, ChevronDown, X } from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatPercent, formatMOIC, paiseToRupees } from '../utils/formatters';

export default function ComparisonPage() {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showPicker, setShowPicker] = useState(false);

    const { data: allStartups, isLoading } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => {
            const res = await startupsAPI.getAll();
            return res.data.data;
        },
    });

    const selectedStartups = useMemo(() => {
        if (!allStartups) return [];
        return selectedIds.map(id => allStartups.find((s: any) => (s._id || s.id) === id)).filter(Boolean);
    }, [allStartups, selectedIds]);

    const toggleStartup = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 4) return prev;
            return [...prev, id];
        });
    };

    const chartColors = ['#C5A454', '#60A5FA', '#4ADE80', '#F472B6'];

    // Build comparison chart data
    const comparisonMetrics = useMemo(() => {
        if (selectedStartups.length === 0) return [];
        return [
            {
                metric: 'Invested',
                ...Object.fromEntries(selectedStartups.map((s: any, i: number) => [`s${i}`, paiseToRupees(s.metrics.invested)])),
            },
            {
                metric: 'Current Value',
                ...Object.fromEntries(selectedStartups.map((s: any, i: number) => [`s${i}`, paiseToRupees(s.metrics.currentValue)])),
            },
        ];
    }, [selectedStartups]);

    const moicData = useMemo(() => {
        if (selectedStartups.length === 0) return [];
        return [{
            metric: 'MOIC',
            ...Object.fromEntries(selectedStartups.map((s: any, i: number) => [`s${i}`, s.metrics.moic || 0])),
        }];
    }, [selectedStartups]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card animate-shimmer" style={{ height: 40, maxWidth: 256 }}></div>
                <div className="card animate-shimmer" style={{ height: 400 }}></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>Compare Startups</h1>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                        Select 2‑4 startups to compare side‑by‑side
                    </p>
                </div>
            </div>

            {/* Startup Selector */}
            <div className="card" style={{ padding: '16px 20px', position: 'relative', zIndex: showPicker ? 50 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {selectedStartups.map((s: any, i: number) => (
                        <span key={s._id || s.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                            background: `${chartColors[i]}20`, color: chartColors[i], border: `1px solid ${chartColors[i]}40`,
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: chartColors[i] }}></span>
                            {s.name}
                            <button title={`Remove ${s.name}`} onClick={() => toggleStartup(s._id || s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {selectedIds.length < 4 && (
                        <div style={{ position: 'relative' }}>
                            <button
                                title="Add a startup to compare"
                                onClick={() => setShowPicker(!showPicker)}
                                className="btn btn-secondary btn-sm"
                            >
                                <GitCompare size={14} /> Add Startup <ChevronDown size={12} />
                            </button>
                            {showPicker && (
                                <>
                                    {/* Click-away backdrop */}
                                    <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50,
                                        background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12,
                                        boxShadow: 'var(--shadow-lg)', minWidth: 260, maxHeight: 300, overflowY: 'auto', padding: 8,
                                    }}>
                                        {allStartups?.filter((s: any) => !selectedIds.includes(s._id || s.id) && s.status === 'active').length === 0 && (
                                            <p style={{ padding: '12px 8px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>No more active startups</p>
                                        )}
                                        {allStartups?.filter((s: any) => !selectedIds.includes(s._id || s.id) && s.status === 'active').map((s: any) => (
                                            <button
                                                key={s._id || s.id}
                                                title={`Compare ${s.name}`}
                                                onClick={() => { toggleStartup(s._id || s.id); setShowPicker(false); }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8,
                                                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500,
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(197,164,84,0.06)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                                                    background: `hsl(${s.name.charCodeAt(0) * 10},55%,18%)`,
                                                    color: `hsl(${s.name.charCodeAt(0) * 10},60%,70%)`,
                                                }}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div>{s.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.sector}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedStartups.length < 2 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <GitCompare size={48} style={{ margin: '0 auto 16px', color: 'var(--color-text-muted)', opacity: 0.4, display: 'block' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                        Select at least 2 startups
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                        Choose startups from the dropdown above to start comparing.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Metrics Comparison Table */}
                    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Key Metrics</h3>
                        </div>
                        <table style={{ width: '100%', minWidth: 520 }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
                                    {selectedStartups.map((s: any, i: number) => (
                                        <th key={s._id || s.id} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: chartColors[i] }}>{s.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Total Invested', render: (s: any) => formatCurrencyCompact(paiseToRupees(s.metrics.invested)), color: (_s: any) => 'var(--color-text-primary)' },
                                    { label: 'Current Value', render: (s: any) => formatCurrencyCompact(paiseToRupees(s.metrics.currentValue)), color: (s: any) => s.metrics.currentValue >= s.metrics.invested ? 'var(--color-green, #34D399)' : 'var(--color-red, #ef4444)' },
                                    { label: 'MOIC', render: (s: any) => formatMOIC(s.metrics.moic), color: (s: any) => (s.metrics.moic || 0) >= 1 ? 'var(--color-primary)' : 'var(--color-red, #ef4444)' },
                                    { label: 'IRR', render: (s: any) => formatPercent(s.metrics.xirr), color: (s: any) => (s.metrics.xirr || 0) >= 0 ? 'var(--color-green, #34D399)' : 'var(--color-red, #ef4444)' },
                                    { label: 'Sector', render: (s: any) => s.sector, color: () => 'var(--color-text-primary)' },
                                    { label: 'Stage', render: (s: any) => s.stage, color: () => 'var(--color-text-primary)' },
                                    { label: 'Equity %', render: (s: any) => `${(s.currentEquityPercent ?? s.equityPercent ?? 0).toFixed(2)}%`, color: () => 'var(--color-text-primary)' },
                                ].map(row => (
                                    <tr key={row.label} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                                        <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{row.label}</td>
                                        {selectedStartups.map((s: any) => (
                                            <td key={s._id || s.id} style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600, color: row.color(s), fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)" }}>
                                                {row.render(s)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Investment Comparison Chart */}
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--color-text-primary)' }}>
                            Investment vs Current Value
                        </h3>
                        <div style={{ height: 320 }}>
                            <ResponsiveContainer>
                                <BarChart data={comparisonMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" vertical={false} />
                                    <XAxis dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                        formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                        labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    {selectedStartups.map((s: any, i: number) => (
                                        <Bar key={s._id || s.id} dataKey={`s${i}`} name={s.name} fill={chartColors[i]} radius={[6, 6, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* MOIC Comparison */}
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--color-text-primary)' }}>
                            MOIC Comparison
                        </h3>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer>
                                <BarChart data={moicData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                        formatter={(v: number | undefined) => `${(v ?? 0).toFixed(2)}x`}
                                        labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    {selectedStartups.map((s: any, i: number) => (
                                        <Bar key={s._id || s.id} dataKey={`s${i}`} name={s.name} fill={chartColors[i]} radius={[0, 6, 6, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
