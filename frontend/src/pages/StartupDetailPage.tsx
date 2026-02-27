import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Plus, DoorOpen, TrendingUp, X, AlertTriangle,
    Share2, Edit3, MapPin, Building2, Calendar, ChevronRight, Download, Mail
} from 'lucide-react';
import { startupsAPI, updatesAPI, documentsAPI } from '../services/api';
import {
    formatCurrencyCompact, formatMOIC, formatPercent, formatDate, formatMonth,
    formatRunway, paiseToRupees
} from '../utils/formatters';
import toast from 'react-hot-toast';

type TabId = 'overview' | 'cashflows' | 'updates' | 'documents';

export default function StartupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabId>('overview');
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

    const { data: documents } = useQuery({
        queryKey: ['startupDocuments', id],
        queryFn: async () => {
            const res = await documentsAPI.getForStartup(id!);
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
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-24" />)}
            </div>
        );
    }

    if (!startup) {
        return (
            <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
                Startup not found
            </div>
        );
    }

    const s = startup;
    const m = s.metrics;

    const tabs: { id: TabId; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'cashflows', label: 'Cashflows' },
        { id: 'updates', label: 'Monthly Updates' },
        { id: 'documents', label: 'Documents' },
    ];

    const statCards = [
        {
            label: 'Total Invested',
            value: formatCurrencyCompact(paiseToRupees(m.invested)),
            sub: s.cashflows?.length > 1 ? 'Initial + Follow-on' : 'Initial',
            icon: '💰',
        },
        {
            label: 'Current Value',
            value: formatCurrencyCompact(paiseToRupees(m.currentValue)),
            sub: m.currentValue > m.invested ? `↑ ${formatPercent((m.currentValue - m.invested) / m.invested)} this year` : '—',
            icon: '📈',
            subColor: m.currentValue > m.invested ? '#16a34a' : '#dc2626',
        },
        {
            label: 'Multiple (MOIC)',
            value: formatMOIC(m.moic),
            sub: m.moic >= 1 ? `↑ +${(m.moic - 1).toFixed(1)}x vs last round` : `↓ ${(m.moic - 1).toFixed(1)}x vs invested`,
            icon: '🎯',
            subColor: m.moic >= 1 ? '#16a34a' : '#dc2626',
        },
        {
            label: 'Net IRR',
            value: formatPercent(m.xirr),
            sub: m.xirr && m.xirr > 0 ? '↑ Top decile' : '—',
            icon: '📊',
            subColor: m.xirr && m.xirr > 0 ? '#16a34a' : '#dc2626',
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Link to="/portfolio" className="hover:text-green-600 transition-colors">Portfolio</Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text-muted)' }}>{s.sector}</span>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">{s.name}</span>
            </nav>

            {/* Company Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0" style={{
                        background: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 92%)`,
                        color: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 40%)`,
                    }}>
                        {s.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.name}</h1>
                            <span className="badge badge-green" style={{ fontSize: '11px', padding: '2px 10px', fontWeight: 700 }}>
                                {s.stage.toUpperCase()}
                            </span>
                        </div>
                        {s.description && (
                            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                {s.description}
                            </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1">
                                <MapPin size={12} /> {s.sector}
                            </span>
                            <span className="flex items-center gap-1">
                                <Building2 size={12} /> {s.sector}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={12} /> Invested {formatDate(s.investmentDate)}
                            </span>
                        </div>
                    </div>
                </div>
                {s.status === 'active' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button className="btn btn-secondary btn-sm">
                            <Share2 size={14} /> Share
                        </button>
                        <button
                            onClick={() => setShowFollowOnModal(true)}
                            className="btn btn-primary btn-sm"
                        >
                            <Edit3 size={14} /> Manage Investment
                        </button>
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className="card" style={{ padding: '20px' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                {card.label}
                            </span>
                            <span className="text-lg">{card.icon}</span>
                        </div>
                        <div className="font-mono text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {card.value}
                        </div>
                        <p className="text-xs font-medium" style={{ color: card.subColor || 'var(--color-text-muted)' }}>
                            {card.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="pb-3 text-sm font-medium transition-all relative"
                        style={{
                            color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                            marginBottom: '-1px',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <OverviewTab startup={s} updates={updates} documents={documents} navigate={navigate} />
            )}

            {activeTab === 'cashflows' && (
                <CashflowsTab startup={s} />
            )}

            {activeTab === 'updates' && (
                <UpdatesTab
                    updates={updates}
                    onAddUpdate={() => setShowUpdateModal(true)}
                    isActive={s.status === 'active'}
                />
            )}

            {activeTab === 'documents' && (
                <DocumentsTab documents={documents} />
            )}

            {/* Action Buttons for active startups */}
            {s.status === 'active' && (
                <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowUpdateModal(true)} className="btn btn-secondary btn-sm">
                        <Plus size={14} /> Add Update
                    </button>
                    <button onClick={() => setShowFollowOnModal(true)} className="btn btn-secondary btn-sm">
                        <TrendingUp size={14} /> Follow-On
                    </button>
                    <button onClick={() => setShowExitModal(true)} className="btn btn-danger btn-sm">
                        <DoorOpen size={14} /> Record Exit
                    </button>
                </div>
            )}

            {/* Modals */}
            {showUpdateModal && <MonthlyUpdateModal onClose={() => setShowUpdateModal(false)} onSubmit={(d: any) => updateMutation.mutate(d)} isLoading={updateMutation.isPending} />}
            {showExitModal && <ExitModal onClose={() => setShowExitModal(false)} onSubmit={(d: any) => exitMutation.mutate(d)} isLoading={exitMutation.isPending} />}
            {showFollowOnModal && <FollowOnModal onClose={() => setShowFollowOnModal(false)} onSubmit={(d: any) => followOnMutation.mutate(d)} isLoading={followOnMutation.isPending} />}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Tab Components
   ═══════════════════════════════════════════════════════════════ */

function OverviewTab({ startup, updates, documents }: any) {
    const s = startup;

    // Build chart data from cashflows
    const chartData = s.cashflows?.map((cf: any) => ({
        name: formatDate(cf.date),
        value: paiseToRupees(Math.abs(cf.amount)),
    })) || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
                {/* Performance Chart */}
                <div className="card" style={{ padding: '24px' }}>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            Performance History
                        </h3>
                        <select className="select" style={{ width: 'auto', minWidth: '140px', padding: '6px 36px 6px 12px', fontSize: '13px' }}>
                            <option>Last 12 Months</option>
                            <option>All Time</option>
                        </select>
                    </div>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                <Tooltip
                                    contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }}
                                    formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                />
                                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#perfGradient)" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3, stroke: 'white', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            Recent Transactions
                        </h3>
                        <button className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>View All</button>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th style={{ padding: '10px 20px', fontSize: '10px' }}>Date</th>
                                <th style={{ padding: '10px 20px', fontSize: '10px' }}>Type</th>
                                <th style={{ padding: '10px 20px', fontSize: '10px' }}>Round</th>
                                <th style={{ padding: '10px 20px', fontSize: '10px', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {s.cashflows?.slice(0, 5).map((cf: any) => (
                                <tr key={cf._id}>
                                    <td className="text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                        {formatDate(cf.date)}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <span className={`badge ${cf.amount < 0 ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                            {cf.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-secondary)' }}>
                                        {cf.roundName || '—'}
                                    </td>
                                    <td className="font-mono text-sm font-semibold text-right" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                        {formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {/* Latest Updates */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        Latest Updates
                    </h3>
                    {updates && updates.length > 0 ? (
                        <div className="space-y-4">
                            {updates.slice(0, 3).map((u: any, idx: number) => (
                                <div key={u._id} className="relative pl-5">
                                    {/* Timeline dot */}
                                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full" style={{
                                        background: idx === 0 ? '#22c55e' : 'var(--color-border)',
                                    }}></div>
                                    {idx < 2 && (
                                        <div className="absolute left-[4px] top-4 w-px h-full" style={{ background: 'var(--color-border-light)' }}></div>
                                    )}
                                    <p className="text-xs font-bold uppercase" style={{
                                        color: idx === 0 ? '#22c55e' : 'var(--color-text-muted)',
                                    }}>
                                        {formatMonth(u.month)}
                                    </p>
                                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                                        Revenue: {formatCurrencyCompact(paiseToRupees(u.revenue))}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                        Burn: {formatCurrencyCompact(paiseToRupees(u.burnRate))} · Runway: {formatRunway(u.runwayMonths)}
                                    </p>
                                    {u.notes && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                            {u.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                            No updates yet
                        </p>
                    )}
                </div>

                {/* Key Documents */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        Key Documents
                    </h3>
                    {documents && documents.length > 0 ? (
                        <div className="space-y-3">
                            {documents.slice(0, 3).map((doc: any) => (
                                <div key={doc._id} className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50" style={{ borderColor: 'var(--color-border-light)' }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                                        background: doc.fileName.endsWith('.pdf') ? '#fee2e2' : '#dbeafe',
                                    }}>
                                        <span className="text-xs font-bold" style={{
                                            color: doc.fileName.endsWith('.pdf') ? '#ef4444' : '#3b82f6',
                                        }}>
                                            {doc.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                            {doc.fileName}
                                        </p>
                                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                            Added {formatDate(doc.uploadedAt)} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                    <button className="p-1.5 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}>
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                            No documents uploaded
                        </p>
                    )}
                </div>

                {/* Contacts */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        Contacts
                    </h3>
                    {s.founderName ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{
                                background: `hsl(${s.founderName.charCodeAt(0) * 12}, 60%, 90%)`,
                                color: `hsl(${s.founderName.charCodeAt(0) * 12}, 60%, 40%)`,
                            }}>
                                {s.founderName.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    {s.founderName}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    CEO & Founder
                                </p>
                            </div>
                            <button className="p-1.5 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-primary)' }}>
                                <Mail size={16} />
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
                            No contacts added
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function CashflowsTab({ startup }: { startup: any }) {
    return (
        <div className="card" style={{ padding: 0 }}>
            <table className="w-full">
                <thead>
                    <tr>
                        <th style={{ padding: '12px 20px' }}>Date</th>
                        <th style={{ padding: '12px 20px' }}>Type</th>
                        <th style={{ padding: '12px 20px' }}>Amount</th>
                        <th style={{ padding: '12px 20px' }}>Round</th>
                        <th style={{ padding: '12px 20px' }}>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {startup.cashflows?.map((cf: any) => (
                        <tr key={cf._id}>
                            <td style={{ padding: '12px 20px' }} className="text-sm">{formatDate(cf.date)}</td>
                            <td style={{ padding: '12px 20px' }}>
                                <span className={`badge ${cf.amount < 0 ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                    {cf.type.replace('_', ' ')}
                                </span>
                            </td>
                            <td style={{ padding: '12px 20px' }} className={`font-mono text-sm font-semibold ${cf.amount < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-green)]'}`}>
                                {cf.amount < 0 ? '-' : '+'}{formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}
                            </td>
                            <td style={{ padding: '12px 20px' }} className="text-sm" >{cf.roundName || '—'}</td>
                            <td style={{ padding: '12px 20px', maxWidth: 200 }} className="text-xs" >{cf.notes || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function UpdatesTab({ updates, onAddUpdate, isActive }: { updates: any[]; onAddUpdate: () => void; isActive: boolean }) {
    return (
        <div className="space-y-4">
            {isActive && (
                <div className="flex justify-end">
                    <button onClick={onAddUpdate} className="btn btn-primary btn-sm">
                        <Plus size={14} /> Add Update
                    </button>
                </div>
            )}
            {updates && updates.length > 0 ? (
                <div className="card" style={{ padding: 0 }}>
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 20px' }}>Month</th>
                                <th style={{ padding: '12px 20px' }}>Revenue</th>
                                <th style={{ padding: '12px 20px' }}>Burn Rate</th>
                                <th style={{ padding: '12px 20px' }}>Cash Balance</th>
                                <th style={{ padding: '12px 20px' }}>Runway</th>
                                <th style={{ padding: '12px 20px' }}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updates.map((u: any) => (
                                <tr key={u._id}>
                                    <td className="text-sm font-medium" style={{ padding: '12px 20px' }}>{formatMonth(u.month)}</td>
                                    <td className="font-mono text-sm" style={{ padding: '12px 20px' }}>{formatCurrencyCompact(paiseToRupees(u.revenue))}</td>
                                    <td className="font-mono text-sm" style={{ padding: '12px 20px' }}>{formatCurrencyCompact(paiseToRupees(u.burnRate))}</td>
                                    <td className="font-mono text-sm" style={{ padding: '12px 20px' }}>{formatCurrencyCompact(paiseToRupees(u.cashBalance))}</td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <span className={`font-mono text-sm font-semibold ${u.runwayMonths < 3 ? 'text-[var(--color-red)]' : u.runwayMonths < 6 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-green)]'}`}>
                                            {formatRunway(u.runwayMonths)}
                                        </span>
                                    </td>
                                    <td className="text-xs" style={{ padding: '12px 20px', color: 'var(--color-text-muted)', maxWidth: 200 }}>{u.notes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                    No monthly updates yet
                </div>
            )}
        </div>
    );
}

function DocumentsTab({ documents }: { documents: any[] }) {
    if (!documents || documents.length === 0) {
        return (
            <div className="card text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                No documents uploaded yet
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc: any) => (
                <div key={doc._id} className="card card-hover flex items-center gap-3" style={{ padding: '16px' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                        background: doc.fileName.endsWith('.pdf') ? '#fee2e2' : '#dbeafe',
                    }}>
                        <span className="text-xs font-bold" style={{
                            color: doc.fileName.endsWith('.pdf') ? '#ef4444' : '#3b82f6',
                        }}>
                            {doc.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.fileName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            {formatDate(doc.uploadedAt)} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                        </p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}>
                        <Download size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Modals
   ═══════════════════════════════════════════════════════════════ */

function MonthlyUpdateModal({ onClose, onSubmit, isLoading }: any) {
    const [form, setForm] = useState({ month: '', revenue: '', burnRate: '', cashBalance: '', notes: '' });
    const runway = form.burnRate && form.cashBalance ?
        (parseFloat(form.cashBalance) <= 0 ? 0 : parseFloat(form.burnRate) === 0 ? Infinity : (parseFloat(form.cashBalance) / parseFloat(form.burnRate))) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Monthly Update</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
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
                        <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-light)' }}>
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
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-red)' }}>Record Exit</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <div className="p-3 rounded-lg mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
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
                        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-4 h-4 rounded" />
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
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Follow-On</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
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
