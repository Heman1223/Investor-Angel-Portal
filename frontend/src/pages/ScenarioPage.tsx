import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp, Calculator, ArrowRight, DollarSign,
    BarChart3, Target, Percent,
} from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatMOIC, formatPercent, paiseToRupees } from '../utils/formatters';

/* ── tiny client-side XIRR (bisection) ── */
function xirrCalc(cfs: { amount: number; date: Date }[]): number | null {
    if (cfs.length < 2) return null;
    const d0 = cfs[0].date.getTime();
    const yearFrac = (d: Date) => (d.getTime() - d0) / (365.25 * 86400000);
    const npv = (rate: number) =>
        cfs.reduce((s, cf) => s + cf.amount / Math.pow(1 + rate, yearFrac(cf.date)), 0);
    let lo = -0.999, hi = 10;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (npv(mid) > 0) lo = mid; else hi = mid;
        if (Math.abs(npv(mid)) < 0.001) return mid;
    }
    return null;
}

export default function ScenarioPage() {
    const { data: startups, isLoading } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => { const r = await startupsAPI.getAll(); return r.data.data; },
    });

    const [selectedId, setSelectedId] = useState('');
    const [mode, setMode] = useState<'exit' | 'followon'>('exit');

    // Exit scenario inputs
    const [exitVal, setExitVal] = useState('');
    // Follow-on scenario inputs
    const [foAmount, setFoAmount] = useState('');
    const [foValuation, setFoValuation] = useState('');

    const selected = useMemo(() =>
        startups?.find((s: any) => (s.id || s.id) === selectedId)
        , [startups, selectedId]);

    const projection = useMemo(() => {
        if (!selected) return null;

        const invested = selected.metrics?.invested || 0; // paise
        const currentMoic = selected.metrics?.moic || 0;
        const currentXirr = selected.metrics?.xirr;
        const cashflows = selected.cashflows || [];

        if (mode === 'exit') {
            const exitRupees = parseFloat(exitVal);
            if (!exitRupees || exitRupees <= 0) return null;
            const exitPaise = exitRupees * 100;
            const projMoic = invested > 0 ? exitPaise / invested : 0;
            // Calculate XIRR with this exit
            const cfs = cashflows.map((cf: any) => ({ amount: cf.amount, date: new Date(cf.date) }));
            cfs.push({ amount: exitPaise, date: new Date() });
            const projXirr = xirrCalc(cfs);
            const gain = exitPaise - invested;

            return {
                projMoic,
                projXirr,
                gain,
                invested,
                exitValue: exitPaise,
                currentMoic,
                currentXirr,
            };
        } else {
            const amtRupees = parseFloat(foAmount);
            const valRupees = parseFloat(foValuation);
            if (!amtRupees || amtRupees <= 0 || !valRupees || valRupees <= 0) return null;
            const amtPaise = amtRupees * 100;
            const valPaise = valRupees * 100;

            const newInvested = invested + amtPaise;
            const currentValue = newInvested * (valPaise / (selected.entryValuation || 1));
            const projMoic = newInvested > 0 ? currentValue / newInvested : 0;

            // XIRR with follow-on + current value
            const cfs = cashflows.map((cf: any) => ({ amount: cf.amount, date: new Date(cf.date) }));
            cfs.push({ amount: -amtPaise, date: new Date() }); // follow-on outflow
            cfs.push({ amount: currentValue, date: new Date() }); // terminal value
            const projXirr = xirrCalc(cfs);

            return {
                projMoic,
                projXirr,
                gain: currentValue - newInvested,
                invested: newInvested,
                exitValue: currentValue,
                currentMoic,
                currentXirr,
            };
        }
    }, [selected, mode, exitVal, foAmount, foValuation]);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>
                    Scenario Planner
                </h1>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                    What-if analysis — project MOIC &amp; XIRR for exits or follow-on investments
                </p>
            </div>

            {/* Controls */}
            <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                            Select Startup
                        </label>
                        <select className="select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setExitVal(''); setFoAmount(''); setFoValuation(''); }}>
                            <option value="">Choose...</option>
                            {startups?.filter((s: any) => s.status === 'active').map((s: any) => (
                                <option key={s.id || s.id} value={s.id || s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                            Scenario Type
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[{ id: 'exit' as const, label: 'What-if Exit' }, { id: 'followon' as const, label: 'What-if Follow-on' }].map(m => (
                                <button key={m.id} onClick={() => setMode(m.id)}
                                    className="btn btn-sm"
                                    style={{
                                        flex: 1,
                                        background: mode === m.id ? 'rgba(212,168,67,0.15)' : 'transparent',
                                        color: mode === m.id ? '#d4a843' : 'var(--color-text-muted)',
                                        border: `1px solid ${mode === m.id ? 'rgba(212,168,67,0.3)' : 'var(--color-border-light)'}`,
                                        fontSize: 12, padding: '8px 12px',
                                    }}
                                >{m.label}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {selected && mode === 'exit' && (
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                            <DollarSign size={13} style={{ display: 'inline', marginRight: 4 }} />
                            Exit Value (₹)
                        </label>
                        <input type="number" className="input" value={exitVal} onChange={e => setExitVal(e.target.value)}
                            placeholder={`Current value: ₹${formatCurrencyCompact(paiseToRupees(selected.metrics?.currentValue || 0))}`}
                            min="0" step="any" style={{ maxWidth: 400 }} />
                    </div>
                )}

                {selected && mode === 'followon' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                Follow-on Amount (₹)
                            </label>
                            <input type="number" className="input" value={foAmount} onChange={e => setFoAmount(e.target.value)}
                                placeholder="e.g. 5,00,000" min="0" step="any" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                Post-Money Valuation (₹)
                            </label>
                            <input type="number" className="input" value={foValuation} onChange={e => setFoValuation(e.target.value)}
                                placeholder="e.g. 10,00,00,000" min="0" step="any" />
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {selected && projection && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <MetricCompare icon={<BarChart3 size={18} />} label="MOIC" current={formatMOIC(projection.currentMoic)} projected={formatMOIC(projection.projMoic)}
                        improved={projection.projMoic > projection.currentMoic} />
                    <MetricCompare icon={<Percent size={18} />} label="XIRR" current={projection.currentXirr !== null ? formatPercent(projection.currentXirr) : 'N/A'}
                        projected={projection.projXirr !== null ? formatPercent(projection.projXirr) : 'N/A'}
                        improved={projection.projXirr !== null && projection.currentXirr !== null && projection.projXirr > projection.currentXirr} />
                    <MetricCompare icon={<TrendingUp size={18} />} label="Gain / Loss" current="" projected={`₹${formatCurrencyCompact(paiseToRupees(projection.gain))}`}
                        improved={projection.gain > 0} />
                    <MetricCompare icon={<Target size={18} />} label="Total Invested" current={`₹${formatCurrencyCompact(paiseToRupees(selected.metrics?.invested || 0))}`}
                        projected={`₹${formatCurrencyCompact(paiseToRupees(projection.invested))}`}
                        improved={false} neutral />
                </div>
            )}

            {selected && !projection && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <Calculator size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 12, display: 'inline-block' }} />
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                        Enter {mode === 'exit' ? 'an exit value' : 'follow-on details'} above to see projected metrics
                    </p>
                </div>
            )}

            {!selected && !isLoading && (
                <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                    <Calculator size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 16, display: 'inline-block' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                        Select a startup to begin
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 auto' }}>
                        Choose an active investment from the dropdown above to model exit or follow-on scenarios
                    </p>
                </div>
            )}
        </div>
    );
}

function MetricCompare({ icon, label, current, projected, improved, neutral }: {
    icon: React.ReactNode; label: string; current: string; projected: string; improved: boolean; neutral?: boolean;
}) {
    const color = neutral ? 'var(--color-primary)' : improved ? 'var(--color-green, #34D399)' : 'var(--color-red, #ef4444)';

    return (
        <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                background: color,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--color-text-muted)' }}>
                {icon}
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            </div>
            {current && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Current: <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{current}</span>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {current && <ArrowRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
                <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)" }}>
                    {projected}
                </span>
            </div>
        </div>
    );
}
