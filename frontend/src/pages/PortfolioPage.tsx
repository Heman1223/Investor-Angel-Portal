import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase, X, TrendingUp, Wallet, PieChart as PieChartIcon, ChevronDown, Filter } from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatPercent, paiseToRupees, getIRRColor } from '../utils/formatters';
import toast from 'react-hot-toast';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'];
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'];

export default function PortfolioPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
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

    // Calculate stats
    const totalInvested = filtered.reduce((sum: number, s: any) => sum + s.metrics.invested, 0);
    const currentValue = filtered.reduce((sum: number, s: any) => sum + s.metrics.currentValue, 0);
    const activeCount = filtered.filter((s: any) => s.status === 'active').length;
    const portfolioCount = filtered.length;

    if (!isLoading && (!startups || startups.length === 0) && !statusFilter) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(20, 184, 48, 0.1)' }}>
                    <Briefcase size={36} style={{ color: '#14b830' }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#111812' }}>No startups yet</h2>
                <p className="text-sm mb-6" style={{ color: '#64748b' }}>Track your first investment here.</p>
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
                    <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#111812' }}>
                        Startups
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
                        Manage and track your angel investment performance
                    </p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)} 
                    className="btn btn-primary px-5 py-2.5 rounded-xl font-semibold shadow-lg"
                    style={{ boxShadow: '0 4px 14px rgba(20, 184, 48, 0.3)' }}
                >
                    <Plus size={20} strokeWidth={2.5} />
                    Add Startup
                </button>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border card-hover" style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 251, 250, 1) 100%)',
                    borderColor: 'var(--color-border-light)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-lg" style={{ 
                            background: 'linear-gradient(135deg, rgba(20, 184, 48, 0.1) 0%, rgba(20, 184, 48, 0.05) 100%)',
                            border: '1px solid rgba(20, 184, 48, 0.15)'
                        }}>
                            <Wallet size={22} style={{ color: '#14b830' }} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ 
                            color: '#15803d',
                            background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
                            border: '1px solid #bbf7d0'
                        }}>
                            +12%
                        </span>
                    </div>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Total Invested
                    </p>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrencyCompact(paiseToRupees(totalInvested))}
                    </h3>
                </div>

                <div className="p-5 rounded-xl border card-hover" style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 251, 250, 1) 100%)',
                    borderColor: 'var(--color-border-light)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-lg" style={{ 
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.15)'
                        }}>
                            <TrendingUp size={22} style={{ color: '#3b82f6' }} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ 
                            color: '#1e40af',
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            border: '1px solid #93c5fd'
                        }}>
                            +24%
                        </span>
                    </div>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Current Value
                    </p>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrencyCompact(paiseToRupees(currentValue))}
                    </h3>
                </div>

                <div className="p-5 rounded-xl border card-hover" style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 251, 250, 1) 100%)',
                    borderColor: 'var(--color-border-light)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-lg" style={{ 
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.15)'
                        }}>
                            <PieChartIcon size={22} style={{ color: '#8b5cf6' }} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ 
                            color: 'var(--color-text-secondary)',
                            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                            border: '1px solid #d1d5db'
                        }}>
                            {activeCount} Active
                        </span>
                    </div>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Portfolio Companies
                    </p>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {portfolioCount}
                    </h3>
                </div>
            </div>

            {/* Filters & Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px] sm:hidden">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} strokeWidth={2} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input w-full py-2.5 pl-10 pr-4"
                        placeholder="Search..."
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border whitespace-nowrap transition-all hover:bg-gray-50 hover:border-gray-300" style={{ 
                    background: 'white',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    boxShadow: 'var(--shadow-xs)'
                }}>
                    <span>All Sectors</span>
                    <ChevronDown size={16} strokeWidth={2} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all"
                    onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
                    style={{ 
                        background: statusFilter === 'active' 
                            ? 'linear-gradient(135deg, #14b830 0%, #12a329 100%)' 
                            : 'white',
                        borderColor: statusFilter === 'active' ? '#14b830' : 'var(--color-border)',
                        color: statusFilter === 'active' ? 'white' : 'var(--color-text-primary)',
                        boxShadow: statusFilter === 'active' 
                            ? '0 2px 8px rgba(20, 184, 48, 0.25)' 
                            : 'var(--shadow-xs)'
                    }}
                >
                    <span>Status: {statusFilter === 'active' ? 'Active' : 'All'}</span>
                    <ChevronDown size={16} strokeWidth={2} />
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border whitespace-nowrap transition-all hover:bg-gray-50 hover:border-gray-300" style={{ 
                    background: 'white',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    boxShadow: 'var(--shadow-xs)'
                }}>
                    <span>Stage: All</span>
                    <ChevronDown size={16} strokeWidth={2} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <div className="flex-1 hidden sm:block"></div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50 hover:border-gray-300" style={{ 
                    background: 'white',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    boxShadow: 'var(--shadow-xs)'
                }}>
                    <Filter size={16} strokeWidth={2} />
                    <span>Filter</span>
                </button>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-16" />)}
                </div>
            ) : (
                <div className="rounded-2xl border overflow-hidden" style={{ 
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr style={{ 
                                    background: '#fafafa',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                        Startup Name
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                        Sector
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: '#64748b' }}>
                                        Invested
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: '#64748b' }}>
                                        Current Value
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: '#64748b' }}>
                                        IRR %
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: '#64748b' }}>
                                        Status
                                    </th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: '#64748b' }}>
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s: any, idx: number) => (
                                    <tr 
                                        key={s._id} 
                                        className="cursor-pointer transition-colors hover:bg-gray-50"
                                        onClick={() => navigate(`/portfolio/${s._id}`)}
                                        style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ 
                                                    background: `hsl(${s.name.charCodeAt(0) * 10}, 70%, 95%)`,
                                                    color: `hsl(${s.name.charCodeAt(0) * 10}, 70%, 45%)`
                                                }}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm" style={{ color: '#111812' }}>
                                                        {s.name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                                                        {s.stage}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ 
                                                background: '#f1f5f9',
                                                color: '#475569'
                                            }}>
                                                {s.sector}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium text-sm" style={{ color: '#475569' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.invested))}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-sm" style={{ color: '#111812' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}
                                        </td>
                                        <td className={`py-4 px-6 text-right font-semibold text-sm ${getIRRColor(s.metrics.xirr)}`}>
                                            {formatPercent(s.metrics.xirr)}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                s.status === 'active' 
                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                    : s.status === 'exited'
                                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${
                                                    s.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                                                }`}></span>
                                                {s.status === 'written_off' ? 'Written Off' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button 
                                                className="p-2 rounded-full transition-colors hover:bg-gray-100" 
                                                style={{ color: '#94a3b8' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="text-lg leading-none">⋮</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: '#f0f0f0' }}>
                        <p className="text-sm" style={{ color: '#64748b' }}>
                            Showing <span className="font-medium" style={{ color: '#111812' }}>1</span> to{' '}
                            <span className="font-medium" style={{ color: '#111812' }}>{Math.min(5, filtered.length)}</span> of{' '}
                            <span className="font-medium" style={{ color: '#111812' }}>{filtered.length}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg border transition-colors hover:bg-gray-50" style={{ 
                                borderColor: '#e5e7eb',
                                color: '#94a3b8'
                            }}>
                                <ChevronDown size={20} className="rotate-90" strokeWidth={2} />
                            </button>
                            <button className="p-2 rounded-lg border transition-colors hover:bg-gray-50" style={{ 
                                borderColor: '#e5e7eb',
                                color: '#94a3b8'
                            }}>
                                <ChevronDown size={20} className="-rotate-90" strokeWidth={2} />
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
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold">Add New Investment</h2>
                    <button onClick={onClose} style={{ color: '#94a3b8' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Startup Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Sector *</label>
                            <select className="select" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Stage *</label>
                            <select className="select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Investment Date *</label>
                        <input type="date" className="input" value={form.investmentDate} onChange={e => setForm({ ...form, investmentDate: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Entry Valuation (₹) *</label>
                            <input type="number" className="input" value={form.entryValuation} onChange={e => setForm({ ...form, entryValuation: e.target.value })} required min="0" step="any" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Amount Invested (₹) *</label>
                            <input type="number" className="input" value={form.investedAmount} onChange={e => setForm({ ...form, investedAmount: e.target.value })} required min="0" step="any" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Equity % *</label>
                            <input type="number" className="input" value={form.equityPercent} onChange={e => setForm({ ...form, equityPercent: e.target.value })} required min="0" max="100" step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Founder Name</label>
                            <input className="input" value={form.founderName} onChange={e => setForm({ ...form, founderName: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>Description</label>
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
