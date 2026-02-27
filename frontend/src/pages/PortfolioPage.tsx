import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, X, TrendingUp, Wallet, PieChart as PieChartIcon, ChevronDown, ChevronLeft, ChevronRight, Filter, MoreVertical } from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatPercent, paiseToRupees, getIRRColor } from '../utils/formatters';
import toast from 'react-hot-toast';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'];
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'];

export default function PortfolioPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const { data: startups, isLoading } = useQuery({
        queryKey: ['startups', statusFilter],
        queryFn: async () => {
            const res = await startupsAPI.getAll(statusFilter || undefined);
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startups'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setShowAddModal(false);
            toast.success('Investment added successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to add investment');
        },
    });

    const filtered = startups?.filter((s: any) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.sector.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const totalInvested = filtered.reduce((sum: number, s: any) => sum + s.metrics.invested, 0);
    const currentValue = filtered.reduce((sum: number, s: any) => sum + s.metrics.currentValue, 0);
    const activeCount = filtered.filter((s: any) => s.status === 'active').length;
    const portfolioCount = filtered.length;

    if (!isLoading && (!startups || startups.length === 0) && !statusFilter) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{
                    background: 'var(--color-primary-50)',
                    border: '2px dashed var(--color-primary)',
                }}>
                    <Briefcase size={36} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>No startups yet</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Track your first investment here.</p>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary"><Plus size={16} /> Add Investment</button>
                {showAddModal && <AddInvestmentModal onClose={() => setShowAddModal(false)} onSubmit={(d: any) => createMutation.mutate(d)} isLoading={createMutation.isPending} />}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                        Startups
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Manage and track your angel investment performance
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    Add Startup
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Total Invested',
                        value: formatCurrencyCompact(paiseToRupees(totalInvested)),
                        icon: Wallet,
                        color: '#22c55e',
                        bgColor: '#dcfce7',
                        change: '+12%',
                        changeColor: '#16a34a',
                    },
                    {
                        label: 'Current Value',
                        value: formatCurrencyCompact(paiseToRupees(currentValue)),
                        icon: TrendingUp,
                        color: '#3b82f6',
                        bgColor: '#dbeafe',
                        change: '+24%',
                        changeColor: '#1d4ed8',
                    },
                    {
                        label: 'Portfolio Companies',
                        value: String(portfolioCount),
                        icon: PieChartIcon,
                        color: '#8b5cf6',
                        bgColor: '#f3e8ff',
                        change: `${activeCount} Active`,
                        changeColor: '#64748b',
                    },
                ].map((stat, i) => (
                    <div key={i} className="card card-hover" style={{ padding: '20px 24px' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 rounded-lg" style={{ background: stat.bgColor }}>
                                <stat.icon size={20} style={{ color: stat.color }} strokeWidth={2} />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{
                                color: stat.changeColor,
                                background: i === 2 ? '#f1f5f9' : stat.bgColor,
                            }}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {stat.label}
                        </p>
                        <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <FilterDropdown label="All Sectors" />
                <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50"
                    onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
                    style={{
                        background: statusFilter === 'active' ? 'var(--color-primary)' : 'white',
                        borderColor: statusFilter === 'active' ? 'var(--color-primary)' : 'var(--color-border)',
                        color: statusFilter === 'active' ? 'white' : 'var(--color-text-primary)',
                    }}
                >
                    Status: {statusFilter === 'active' ? 'Active' : 'All'}
                    <ChevronDown size={14} />
                </button>
                <FilterDropdown label="Stage: All" />
                <div className="flex-1 hidden sm:block" />
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50" style={{
                    background: 'white',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                }}>
                    <Filter size={14} />
                    Filter
                </button>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-16" />)}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th style={{ padding: '12px 24px' }}>Startup Name</th>
                                    <th style={{ padding: '12px 24px' }}>Sector</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right' }}>Invested</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right' }}>Current Value</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right' }}>IRR %</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s: any) => (
                                    <tr
                                        key={s._id}
                                        className="cursor-pointer"
                                        onClick={() => navigate(`/portfolio/${s._id}`)}
                                    >
                                        <td style={{ padding: '14px 24px' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{
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
                                                        {s.stage}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 24px' }}>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium" style={{
                                                background: '#f1f5f9',
                                                color: '#475569',
                                            }}>
                                                {s.sector}
                                            </span>
                                        </td>
                                        <td className="font-mono text-sm text-right" style={{ padding: '14px 24px', color: 'var(--color-text-secondary)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.invested))}
                                        </td>
                                        <td className="font-mono text-sm font-semibold text-right" style={{ padding: '14px 24px', color: 'var(--color-text-primary)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}
                                        </td>
                                        <td className={`font-mono text-sm font-semibold text-right ${getIRRColor(s.metrics.xirr)}`} style={{ padding: '14px 24px' }}>
                                            {formatPercent(s.metrics.xirr)}
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                            <span className={`badge ${s.status === 'active' ? 'badge-green' :
                                                s.status === 'exited' ? 'badge-gray' :
                                                    s.status === 'written_off' ? 'badge-red' : 'badge-yellow'
                                                }`} style={{ fontSize: '11px', padding: '2px 10px' }}>
                                                <span className="badge-dot" style={{
                                                    background: s.status === 'active' ? '#22c55e' :
                                                        s.status === 'exited' ? '#64748b' : '#ef4444',
                                                }}></span>
                                                {s.status === 'written_off' ? 'Written Off' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                            <button
                                                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                                                style={{ color: 'var(--color-text-muted)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)' }}>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Showing <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>1</span> to{' '}
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{Math.min(5, filtered.length)}</span> of{' '}
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</span> results
                        </p>
                        <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg border transition-colors hover:bg-gray-50" style={{
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-muted)',
                            }}>
                                <ChevronLeft size={16} />
                            </button>
                            <button className="p-1.5 rounded-lg border transition-colors hover:bg-gray-50" style={{
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-muted)',
                            }}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <AddInvestmentModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={(d: any) => createMutation.mutate(d)}
                    isLoading={createMutation.isPending}
                />
            )}
        </div>
    );
}

function FilterDropdown({ label }: { label: string }) {
    return (
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50" style={{
            background: 'white',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
        }}>
            {label}
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
        </button>
    );
}

function AddInvestmentModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({
        name: '', sector: 'FinTech', stage: 'Seed', investmentDate: '', entryValuation: '',
        investedAmount: '', equityPercent: '', founderName: '', description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            entryValuation: parseFloat(form.entryValuation),
            investedAmount: parseFloat(form.investedAmount),
            equityPercent: parseFloat(form.equityPercent),
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add New Investment</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Startup Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Sector *</label>
                            <select className="select" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Stage *</label>
                            <select className="select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Investment Date *</label>
                        <input type="date" className="input" value={form.investmentDate} onChange={e => setForm({ ...form, investmentDate: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Entry Valuation (₹) *</label>
                            <input type="number" className="input" value={form.entryValuation} onChange={e => setForm({ ...form, entryValuation: e.target.value })} required min="0" step="any" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Amount Invested (₹) *</label>
                            <input type="number" className="input" value={form.investedAmount} onChange={e => setForm({ ...form, investedAmount: e.target.value })} required min="0" step="any" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Equity % *</label>
                            <input type="number" className="input" value={form.equityPercent} onChange={e => setForm({ ...form, equityPercent: e.target.value })} required min="0" max="100" step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Founder Name</label>
                            <input className="input" value={form.founderName} onChange={e => setForm({ ...form, founderName: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                        <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
                            {isLoading ? 'Adding...' : 'Add Investment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
