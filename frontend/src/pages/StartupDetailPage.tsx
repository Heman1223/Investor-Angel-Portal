import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, DoorOpen, TrendingUp, X, AlertTriangle } from 'lucide-react';
import { startupsAPI, updatesAPI } from '../services/api';
import { formatCurrencyCompact, formatMOIC, formatPercent, formatDate, formatMonth, formatRunway, paiseToRupees } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function StartupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showFollowOnModal, setShowFollowOnModal] = useState(false);

    const { data: startup, isLoading } = useQuery({
        queryKey: ['startup', id],
        queryFn: async () => {
            const res = await startupsAPI.getById(id!);
            return res.data.data;
        },
        enabled: !!id,
    });

    const { data: updates } = useQuery({
        queryKey: ['updates', id],
        queryFn: async () => {
            const res = await updatesAPI.getForStartup(id!);
            return res.data.data;
        },
        enabled: !!id,
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => updatesAPI.create(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', id] });
            queryClient.invalidateQueries({ queryKey: ['updates', id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
            setShowUpdateModal(false);
            toast.success('Monthly update submitted');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to submit update'),
    });

    const exitMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.recordExit(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setShowExitModal(false);
            toast.success('Exit recorded');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to record exit'),
    });

    const followOnMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.addFollowOn(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setShowFollowOnModal(false);
            toast.success('Follow-on recorded');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
    });

    if (isLoading) {
        return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-24" />)}</div>;
    }
    if (!startup) return <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>Startup not found</div>;

    const s = startup;
    const m = s.metrics;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/portfolio')} className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-text-muted)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-primary)' }}>{s.name}</h1>
                            <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'exited' ? 'badge-gold' : 'badge-red'}`}>
                                {s.status === 'written_off' ? 'Written Off' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                            </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {s.sector} · {s.stage} · Invested {formatDate(s.investmentDate)}
                        </p>
                    </div>
                </div>
                {s.status === 'active' && (
                    <div className="flex gap-2">
                        <button onClick={() => setShowUpdateModal(true)} className="btn btn-secondary btn-sm"><Plus size={14} /> Add Update</button>
                        <button onClick={() => setShowFollowOnModal(true)} className="btn btn-secondary btn-sm"><TrendingUp size={14} /> Follow-On</button>
                        <button onClick={() => setShowExitModal(true)} className="btn btn-danger btn-sm"><DoorOpen size={14} /> Record Exit</button>
                    </div>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Invested', value: formatCurrencyCompact(paiseToRupees(m.invested)), color: 'var(--color-blue)' },
                    { label: 'Current Value', value: formatCurrencyCompact(paiseToRupees(m.currentValue)), color: 'var(--color-green)' },
                    { label: 'MOIC', value: formatMOIC(m.moic), color: m.moic >= 1 ? 'var(--color-green)' : 'var(--color-red)' },
                    { label: 'IRR', value: formatPercent(m.xirr), color: m.xirr && m.xirr > 0 ? 'var(--color-green)' : 'var(--color-red)' },
                    { label: 'Unrealised Gain', value: formatCurrencyCompact(paiseToRupees(m.unrealisedGain)), color: m.unrealisedGain >= 0 ? 'var(--color-green)' : 'var(--color-red)' },
                    { label: 'Equity', value: `${s.currentEquityPercent}%`, color: 'var(--color-gold)' },
                ].map((metric, i) => (
                    <div key={i} className="card" style={{ borderLeft: `3px solid ${metric.color}`, padding: '16px 20px' }}>
                        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{metric.label}</span>
                        <div className="font-mono text-lg font-semibold mt-1" style={{ color: metric.color }}>{metric.value}</div>
                    </div>
                ))}
            </div>

            {/* Info Card */}
            <div className="card">
                <h3 className="font-display text-lg mb-3">Company Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Entry Valuation</span><p className="font-mono mt-1">{formatCurrencyCompact(paiseToRupees(s.entryValuation))}</p></div>
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Current Valuation</span><p className="font-mono mt-1">{formatCurrencyCompact(paiseToRupees(s.currentValuation))}</p></div>
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Founder</span><p className="mt-1">{s.founderName || '—'}</p></div>
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Website</span><p className="mt-1">{s.website ? <a href={s.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)' }}>{s.website}</a> : '—'}</p></div>
                </div>
                {s.description && <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>{s.description}</p>}
            </div>

            {/* Cashflows */}
            <div className="card" style={{ padding: 0 }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-display text-lg">Cashflows</h3>
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Round</th><th>Notes</th></tr></thead>
                        <tbody>
                            {s.cashflows?.map((cf: any) => (
                                <tr key={cf._id}>
                                    <td>{formatDate(cf.date)}</td>
                                    <td><span className={`badge ${cf.amount < 0 ? 'badge-red' : 'badge-green'}`}>{cf.type.replace('_', ' ')}</span></td>
                                    <td className={`font-mono ${cf.amount < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-green)]'}`}>
                                        {cf.amount < 0 ? '-' : '+'}{formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}
                                    </td>
                                    <td>{cf.roundName || '—'}</td>
                                    <td style={{ color: 'var(--color-text-muted)', maxWidth: 200 }}>{cf.notes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Monthly Updates */}
            <div className="card" style={{ padding: 0 }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-display text-lg">Monthly Updates</h3>
                </div>
                {updates && updates.length > 0 ? (
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead><tr><th>Month</th><th>Revenue</th><th>Burn Rate</th><th>Cash Balance</th><th>Runway</th><th>Notes</th></tr></thead>
                            <tbody>
                                {updates.map((u: any) => (
                                    <tr key={u._id}>
                                        <td className="font-medium">{formatMonth(u.month)}</td>
                                        <td className="font-mono">{formatCurrencyCompact(paiseToRupees(u.revenue))}</td>
                                        <td className="font-mono">{formatCurrencyCompact(paiseToRupees(u.burnRate))}</td>
                                        <td className="font-mono">{formatCurrencyCompact(paiseToRupees(u.cashBalance))}</td>
                                        <td>
                                            <span className={`font-mono ${u.runwayMonths < 3 ? 'text-[var(--color-red)]' : u.runwayMonths < 6 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-green)]'}`}>
                                                {formatRunway(u.runwayMonths)}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)', maxWidth: 200 }}>{u.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No monthly updates yet
                    </div>
                )}
            </div>

            {/* Dilution History */}
            {s.dilutionEvents && s.dilutionEvents.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <h3 className="font-display text-lg">Dilution History</h3>
                    </div>
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead><tr><th>Date</th><th>Round</th><th>Pre-Dilution</th><th>Post-Dilution</th><th>Valuation</th></tr></thead>
                            <tbody>
                                {s.dilutionEvents.map((de: any) => (
                                    <tr key={de._id}>
                                        <td>{formatDate(de.date)}</td>
                                        <td>{de.roundName}</td>
                                        <td className="font-mono">{de.preDilutionEquity}%</td>
                                        <td className="font-mono">{de.postDilutionEquity}%</td>
                                        <td className="font-mono">{de.roundValuation ? formatCurrencyCompact(paiseToRupees(de.roundValuation)) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showUpdateModal && <MonthlyUpdateModal onClose={() => setShowUpdateModal(false)} onSubmit={(d: any) => updateMutation.mutate(d)} isLoading={updateMutation.isPending} />}
            {showExitModal && <ExitModal onClose={() => setShowExitModal(false)} onSubmit={(d: any) => exitMutation.mutate(d)} isLoading={exitMutation.isPending} />}
            {showFollowOnModal && <FollowOnModal onClose={() => setShowFollowOnModal(false)} onSubmit={(d: any) => followOnMutation.mutate(d)} isLoading={followOnMutation.isPending} />}
        </div>
    );
}

function MonthlyUpdateModal({ onClose, onSubmit, isLoading }: any) {
    const [form, setForm] = useState({ month: '', revenue: '', burnRate: '', cashBalance: '', notes: '' });
    const runway = form.burnRate && form.cashBalance ?
        (parseFloat(form.cashBalance) <= 0 ? 0 : parseFloat(form.burnRate) === 0 ? Infinity : (parseFloat(form.cashBalance) / parseFloat(form.burnRate))) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-xl">Add Monthly Update</h2>
                    <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, revenue: parseFloat(form.revenue), burnRate: parseFloat(form.burnRate), cashBalance: parseFloat(form.cashBalance) }); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Month *</label>
                        <input type="month" className="input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Revenue (₹) *</label>
                            <input type="number" className="input" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} required min="0" step="any" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Burn Rate (₹) *</label>
                            <input type="number" className="input" value={form.burnRate} onChange={e => setForm({ ...form, burnRate: e.target.value })} required min="0" step="any" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Cash Balance (₹) *</label>
                        <input type="number" className="input" value={form.cashBalance} onChange={e => setForm({ ...form, cashBalance: e.target.value })} required step="any" />
                    </div>
                    {runway !== null && (
                        <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Estimated Runway:</span>
                            <span className={`font-mono text-lg ml-2 font-semibold ${runway < 3 ? 'text-[var(--color-red)]' : runway < 6 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-green)]'}`}>
                                {formatRunway(Math.round(runway * 10) / 10)}
                            </span>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">{isLoading ? 'Saving...' : 'Submit Update'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ExitModal({ onClose, onSubmit, isLoading }: any) {
    const [form, setForm] = useState({ exitDate: '', exitValue: '', exitType: 'Acquisition' });
    const [confirmed, setConfirmed] = useState(false);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-xl" style={{ color: 'var(--color-red)' }}>Record Exit</h2>
                    <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
                </div>
                <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-red)' }}>
                        <AlertTriangle size={16} /> This will permanently close this investment. This cannot be undone.
                    </div>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (confirmed) onSubmit({ ...form, exitValue: parseFloat(form.exitValue) }); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Exit Date *</label>
                        <input type="date" className="input" value={form.exitDate} onChange={e => setForm({ ...form, exitDate: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Exit Value (₹) *</label>
                        <input type="number" className="input" value={form.exitValue} onChange={e => setForm({ ...form, exitValue: e.target.value })} required min="0" step="any" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Exit Type *</label>
                        <select className="select" value={form.exitType} onChange={e => setForm({ ...form, exitType: e.target.value })}>
                            <option>Acquisition</option>
                            <option>IPO</option>
                            <option>Secondary Sale</option>
                            <option>Buyback</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-4 h-4" />
                        I confirm this exit is final and cannot be undone
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={!confirmed || isLoading} className="btn btn-danger flex-1">{isLoading ? 'Recording...' : 'Record Exit'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FollowOnModal({ onClose, onSubmit, isLoading }: any) {
    const [form, setForm] = useState({ amount: '', date: '', roundName: '', equityAcquired: '', valuationAtTime: '' });
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-xl">Add Follow-On</h2>
                    <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: parseFloat(form.amount), equityAcquired: parseFloat(form.equityAcquired), valuationAtTime: parseFloat(form.valuationAtTime) }); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Amount (₹) *</label>
                            <input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" step="any" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
                            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Round Name *</label>
                        <input className="input" value={form.roundName} onChange={e => setForm({ ...form, roundName: e.target.value })} required placeholder="e.g. Series A Follow-on" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Equity % *</label>
                            <input type="number" className="input" value={form.equityAcquired} onChange={e => setForm({ ...form, equityAcquired: e.target.value })} required min="0" max="100" step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Valuation (₹) *</label>
                            <input type="number" className="input" value={form.valuationAtTime} onChange={e => setForm({ ...form, valuationAtTime: e.target.value })} required min="0" step="any" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">{isLoading ? 'Adding...' : 'Add Follow-On'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
