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
        return selectedIds.map(id => allStartups.find((s: any) => s._id === id)).filter(Boolean);
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
            <div className="space-y-6 animate-[pulse_1.5s_ease-in-out_infinite]">
                <div className="h-10 w-64 rounded bg-[rgba(255,255,255,0.03)]"></div>
                <div className="h-[400px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(197,164,84,0.04)]"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>Compare Startups</h1>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                        Select 2-4 startups to compare side-by-side
                    </p>
                </div>
            </div>

            {/* Startup Selector */}
            <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {selectedStartups.map((s: any, i: number) => (
                        <span key={s._id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                            background: `${chartColors[i]}20`, color: chartColors[i], border: `1px solid ${chartColors[i]}40`,
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: chartColors[i] }}></span>
                            {s.name}
                            <button onClick={() => toggleStartup(s._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {selectedIds.length < 4 && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowPicker(!showPicker)}
                                className="btn btn-secondary btn-sm"
                            >
                                <GitCompare size={14} /> Add Startup <ChevronDown size={12} />
                            </button>
                            {showPicker && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50,
                                    background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12,
                                    boxShadow: 'var(--shadow-lg)', minWidth: 240, maxHeight: 300, overflowY: 'auto', padding: 8,
                                }}>
                                    {allStartups?.filter((s: any) => !selectedIds.includes(s._id) && s.status === 'active').map((s: any) => (
                                        <button
                                            key={s._id}
                                            onClick={() => { toggleStartup(s._id); setShowPicker(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8,
                                                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500,
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
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
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedStartups.length < 2 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <GitCompare size={48} style={{ margin: '0 auto 16px', color: 'var(--color-text-muted)', opacity: 0.4 }} />
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
                    <div className="card" style={{ padding: 0 }}>
                        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Key Metrics</h3>
                        </div>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '12px 20px' }}>Metric</th>
                                    {selectedStartups.map((s: any, i: number) => (
                                        <th key={s._id} style={{ padding: '12px 20px', color: chartColors[i] }}>{s.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Total Invested</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="font-mono text-sm font-semibold" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.invested))}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Current Value</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="font-mono text-sm font-semibold" style={{ padding: '12px 20px', color: s.metrics.currentValue >= s.metrics.invested ? 'var(--color-green)' : 'var(--color-red)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>MOIC</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="font-mono text-sm font-semibold" style={{ padding: '12px 20px', color: (s.metrics.moic || 0) >= 1 ? 'var(--color-primary)' : 'var(--color-red)' }}>
                                            {formatMOIC(s.metrics.moic)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>IRR</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="font-mono text-sm font-semibold" style={{ padding: '12px 20px', color: (s.metrics.xirr || 0) >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                                            {formatPercent(s.metrics.xirr)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Sector</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                            {s.sector}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Stage</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                            {s.stage}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Equity %</td>
                                    {selectedStartups.map((s: any) => (
                                        <td key={s._id} className="font-mono text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                            {s.currentEquityPercent?.toFixed(2) || s.equityPercent?.toFixed(2)}%
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Investment Comparison Chart */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 className="text-base font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                            Investment vs Current Value
                        </h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={comparisonMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" vertical={false} />
                                    <XAxis dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                        formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                    />
                                    <Legend />
                                    {selectedStartups.map((s: any, i: number) => (
                                        <Bar key={s._id} dataKey={`s${i}`} name={s.name} fill={chartColors[i]} radius={[6, 6, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* MOIC Comparison */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 className="text-base font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                            MOIC Comparison
                        </h3>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={moicData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                        formatter={(v: number | undefined) => `${(v ?? 0).toFixed(2)}x`}
                                    />
                                    <Legend />
                                    {selectedStartups.map((s: any, i: number) => (
                                        <Bar key={s._id} dataKey={`s${i}`} name={s.name} fill={chartColors[i]} radius={[0, 6, 6, 0]} />
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
