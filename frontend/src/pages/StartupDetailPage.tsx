import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Plus, DoorOpen, TrendingUp, X, AlertTriangle,
    Share2, Edit3, MapPin, Building2, Calendar, ChevronRight, Download, Mail,
    Users, StickyNote, Send, ChevronDown, Trash2
} from 'lucide-react';
import { startupsAPI, updatesAPI, documentsAPI, cashflowsAPI } from '../services/api';
import {
    formatCurrencyCompact, formatMOIC, formatPercent, formatDate, formatMonth,
    formatRunway, paiseToRupees
} from '../utils/formatters';
import { invalidateInvestmentQueries } from '../utils/invalidation';
import toast from 'react-hot-toast';

type TabId = 'overview' | 'cashflows' | 'updates' | 'documents' | 'notes' | 'dilution';

export default function StartupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showFollowOnModal, setShowFollowOnModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showWriteOffConfirm, setShowWriteOffConfirm] = useState(false);
    const [showManageMenu, setShowManageMenu] = useState(false);

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
            invalidateInvestmentQueries(queryClient, id);
            setShowUpdateModal(false);
            toast.success('Monthly update submitted');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to submit update'),
    });

    const exitMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.recordExit(id!, data),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient, id);
            setShowExitModal(false);
            toast.success('Exit recorded');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to record exit'),
    });

    const followOnMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.addFollowOn(id!, data),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient, id);
            setShowFollowOnModal(false);
            toast.success('Follow-on recorded');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
    });

    const noteMutation = useMutation({
        mutationFn: (text: string) => startupsAPI.addNote(id!, text),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient, id);
            toast.success('Note added');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to add note'),
    });

    const editMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.update(id!, data),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient, id);
            setShowEditModal(false);
            toast.success('Startup updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to update startup'),
    });

    const writeOffMutation = useMutation({
        mutationFn: () => startupsAPI.delete(id!),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient, id);
            setShowWriteOffConfirm(false);
            toast.success('Startup written off');
            navigate('/portfolio');
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to write off'),
    });

    if (isLoading) {
        return (
            <div className="space-y-6 animate-[pulse_1.5s_ease-in-out_infinite]">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(197,164,84,0.05)]"></div>
                        <div className="space-y-3">
                            <div className="w-48 h-8 rounded bg-[rgba(255,255,255,0.03)]"></div>
                            <div className="w-32 h-4 rounded bg-[rgba(255,255,255,0.03)]"></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[90px] rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(197,164,84,0.04)]"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[340px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(197,164,84,0.04)]"></div>
                    <div className="h-[340px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(197,164,84,0.04)]"></div>
                </div>
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
        { id: 'notes', label: 'Notes & Co-investors' },
        { id: 'dilution', label: 'Dilution History' },
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
            subColor: m.currentValue > m.invested ? 'var(--color-green)' : 'var(--color-red)',
        },
        {
            label: 'Multiple (MOIC)',
            value: formatMOIC(m.moic),
            sub: m.moic >= 1 ? `↑ +${(m.moic - 1).toFixed(1)}x vs last round` : `↓ ${(m.moic - 1).toFixed(1)}x vs invested`,
            icon: '🎯',
            subColor: m.moic >= 1 ? 'var(--color-green)' : 'var(--color-red)',
        },
        {
            label: 'Net IRR',
            value: formatPercent(m.xirr),
            sub: m.xirr && m.xirr > 0 ? '↑ Top decile' : '—',
            icon: '📊',
            subColor: m.xirr && m.xirr > 0 ? 'var(--color-green)' : 'var(--color-red)',
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Link to="/portfolio" className="transition-colors" style={{ color: 'var(--color-text-muted)' }}>Portfolio</Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text-muted)' }}>{s.sector}</span>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">{s.name}</span>
            </nav>

            {/* Company Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0" style={{
                        background: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 20%)`,
                        color: `hsl(${s.name.charCodeAt(0) * 10}, 65%, 75%)`,
                    }}>
                        {s.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>{s.name}</h1>
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
                        <button title="Share startup details" className="btn btn-secondary btn-sm">
                            <Share2 size={14} /> Share
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                title="Manage this investment"
                                onClick={() => setShowManageMenu(!showManageMenu)}
                                className="btn btn-primary btn-sm"
                            >
                                <Edit3 size={14} /> Manage <ChevronDown size={12} />
                            </button>
                            {showManageMenu && (
                                <div style={{
                                    position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 200,
                                    background: 'var(--color-card-bg, #0f1c2e)', border: '1px solid var(--color-border-light)',
                                    borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,.5)', zIndex: 50, overflow: 'hidden',
                                }}>
                                    <button
                                        title="Edit startup details"
                                        onClick={() => { setShowManageMenu(false); setShowEditModal(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <Edit3 size={14} /> Edit Startup
                                    </button>
                                    <button
                                        title="Add a follow-on investment"
                                        onClick={() => { setShowManageMenu(false); setShowFollowOnModal(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <TrendingUp size={14} /> Add Follow-On
                                    </button>
                                    <div style={{ height: 1, background: 'var(--color-border-light)', margin: '4px 0' }} />
                                    <button
                                        title="Write off this startup"
                                        onClick={() => { setShowManageMenu(false); setShowWriteOffConfirm(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', color: 'var(--color-red, #ef4444)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <Trash2 size={14} /> Write Off Startup
                                    </button>
                                </div>
                            )}
                        </div>
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

            {activeTab === 'notes' && (
                <NotesTab
                    startup={s}
                    onAddNote={(text: string) => noteMutation.mutate(text)}
                    isLoading={noteMutation.isPending}
                />
            )}

            {activeTab === 'dilution' && (
                <DilutionTab startup={s} />
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
            {showEditModal && <EditStartupModal startup={s} onClose={() => setShowEditModal(false)} onSubmit={(d: any) => editMutation.mutate(d)} isLoading={editMutation.isPending} />}
            {showWriteOffConfirm && <WriteOffConfirmDialog startupName={s.name} onClose={() => setShowWriteOffConfirm(false)} onConfirm={() => writeOffMutation.mutate()} isLoading={writeOffMutation.isPending} />}
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
                                        <stop offset="5%" stopColor="#C5A454" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#C5A454" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                    formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                />
                                <Area type="monotone" dataKey="value" stroke="#C5A454" fill="url(#perfGradient)" strokeWidth={2.5} dot={{ fill: '#C5A454', r: 3, stroke: '#0B1221', strokeWidth: 2 }} />
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
                                <div key={u._id} className="relative pl-5 group cursor-default">
                                    {/* Timeline dot */}
                                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full transition-all duration-300 group-hover:scale-125 group-hover:bg-[#C5A454] shadow-[0_0_10px_transparent] group-hover:shadow-[0_0_12px_rgba(197,164,84,0.6)]" style={{
                                        background: idx === 0 ? '#C5A454' : 'var(--color-border)',
                                        boxShadow: idx === 0 ? '0 0 10px rgba(197,164,84,0.3)' : undefined
                                    }}></div>
                                    {idx < 2 && (
                                        <div className="absolute left-[4px] top-4 w-px h-[calc(100%+12px)] transition-colors duration-300 group-hover:bg-[#C5A454]" style={{ background: 'var(--color-border-light)' }}></div>
                                    )}
                                    <p className="text-xs font-bold uppercase transition-colors duration-300 group-hover:text-[#D4B96A]" style={{
                                        color: idx === 0 ? '#C5A454' : 'var(--color-text-muted)',
                                    }}>
                                        {formatMonth(u.month)}
                                    </p>
                                    <p className="text-sm font-semibold mt-0.5 transition-colors duration-300 group-hover:text-white" style={{ color: 'var(--color-text-primary)' }}>
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
                                <div key={doc._id} className="flex items-center gap-3 p-3 rounded-lg border transition-colors" style={{ borderColor: 'var(--color-border-light)' }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                                        background: doc.fileName.endsWith('.pdf') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    }}>
                                        <span className="text-xs font-bold" style={{
                                            color: doc.fileName.endsWith('.pdf') ? 'var(--color-red)' : 'var(--color-blue, #60a5fa)',
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
                                    <button className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
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
                                background: `hsl(${s.founderName.charCodeAt(0) * 12}, 60%, 20%)`,
                                color: `hsl(${s.founderName.charCodeAt(0) * 12}, 60%, 75%)`,
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
                            <button className="p-1.5 rounded-lg" style={{ color: 'var(--color-primary)' }}>
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
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCf, setEditingCf] = useState<any>(null);
    const [deletingCf, setDeletingCf] = useState<any>(null);

    const addMutation = useMutation({
        mutationFn: (data: any) => cashflowsAPI.add(startup.id, data),
        onSuccess: () => { invalidateInvestmentQueries(queryClient, startup.id); setShowAddModal(false); toast.success('Cashflow added'); },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
    });
    const editMutation = useMutation({
        mutationFn: ({ cfId, data }: { cfId: string; data: any }) => cashflowsAPI.update(startup.id, cfId, data),
        onSuccess: () => { invalidateInvestmentQueries(queryClient, startup.id); setEditingCf(null); toast.success('Cashflow updated'); },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
    });
    const deleteMutation = useMutation({
        mutationFn: ({ cfId, reason }: { cfId: string; reason: string }) => cashflowsAPI.delete(startup.id, cfId, reason),
        onSuccess: () => { invalidateInvestmentQueries(queryClient, startup.id); setDeletingCf(null); toast.success('Cashflow deleted'); },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
    });

    return (
        <div className="card" style={{ padding: 0 }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Transaction Ledger</h3>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: '5px 12px' }}>
                    <Plus size={13} /> Add Entry
                </button>
            </div>
            <table className="w-full">
                <thead>
                    <tr>
                        <th style={{ padding: '12px 20px' }}>Date</th>
                        <th style={{ padding: '12px 20px' }}>Type</th>
                        <th style={{ padding: '12px 20px' }}>Amount</th>
                        <th style={{ padding: '12px 20px' }}>Round</th>
                        <th style={{ padding: '12px 20px' }}>Notes</th>
                        <th style={{ padding: '12px 14px', width: 70 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {startup.cashflows?.map((cf: any) => (
                        <tr key={cf.id || cf._id}>
                            <td style={{ padding: '12px 20px' }} className="text-sm">{formatDate(cf.date)}</td>
                            <td style={{ padding: '12px 20px' }}>
                                <span className={`badge ${cf.amount < 0 ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                    {cf.type.replace('_', ' ')}
                                </span>
                            </td>
                            <td style={{ padding: '12px 20px' }} className={`font-mono text-sm font-semibold ${cf.amount < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-green)]'}`}>
                                {cf.amount < 0 ? '-' : '+'}{formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}
                            </td>
                            <td style={{ padding: '12px 20px' }} className="text-sm">{cf.roundName || '—'}</td>
                            <td style={{ padding: '12px 20px', maxWidth: 200 }} className="text-xs">{cf.notes || '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingCf(cf)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} title="Edit">
                                        <Edit3 size={13} />
                                    </button>
                                    <button onClick={() => setDeletingCf(cf)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-red, #ef4444)' }} title="Delete">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {(!startup.cashflows || startup.cashflows.length === 0) && (
                        <tr><td colSpan={6} className="text-center text-sm py-6" style={{ color: 'var(--color-text-muted)' }}>No cashflow entries</td></tr>
                    )}
                </tbody>
            </table>
            {showAddModal && <AddCashflowModal onClose={() => setShowAddModal(false)} onSubmit={(d: any) => addMutation.mutate(d)} isLoading={addMutation.isPending} />}
            {editingCf && <EditCashflowModal cashflow={editingCf} onClose={() => setEditingCf(null)} onSubmit={(d: any) => editMutation.mutate({ cfId: editingCf.id || editingCf._id, data: d })} isLoading={editMutation.isPending} />}
            {deletingCf && <DeleteCashflowConfirm cashflow={deletingCf} onClose={() => setDeletingCf(null)} onConfirm={(reason: string) => deleteMutation.mutate({ cfId: deletingCf.id || deletingCf._id, reason })} isLoading={deleteMutation.isPending} />}
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
                        background: doc.fileName.endsWith('.pdf') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    }}>
                        <span className="text-xs font-bold" style={{
                            color: doc.fileName.endsWith('.pdf') ? 'var(--color-red)' : 'var(--color-blue, #60a5fa)',
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
                    <button className="p-2 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                        <Download size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function NotesTab({ startup, onAddNote, isLoading }: { startup: any; onAddNote: (text: string) => void; isLoading: boolean }) {
    const [noteText, setNoteText] = useState('');
    const notes = (startup.notes as Array<{ text: string; createdAt: string }>) || [];
    const coInvestors = startup.coInvestors ? startup.coInvestors.split(',').map((c: string) => c.trim()).filter(Boolean) : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes */}
            <div className="lg:col-span-2 space-y-4">
                {/* Add Note */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        <StickyNote size={16} style={{ display: 'inline', marginRight: 8 }} />
                        Add Note
                    </h3>
                    <form onSubmit={e => { e.preventDefault(); if (noteText.trim()) { onAddNote(noteText.trim()); setNoteText(''); } }} className="flex gap-3">
                        <textarea
                            className="input flex-1"
                            rows={2}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Add a note about this startup..."
                            style={{ resize: 'vertical' }}
                        />
                        <button type="submit" disabled={isLoading || !noteText.trim()} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                            <Send size={14} /> {isLoading ? 'Adding...' : 'Add'}
                        </button>
                    </form>
                </div>

                {/* Notes List */}
                {notes.length > 0 ? (
                    <div className="space-y-3">
                        {notes.map((note, i) => (
                            <div key={i} className="card" style={{ padding: '16px 20px' }}>
                                <p className="text-sm" style={{ color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{note.text}</p>
                                <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                        No notes yet — add one above
                    </div>
                )}
            </div>

            {/* Co-investors sidebar */}
            <div>
                <div className="card" style={{ padding: '20px' }}>
                    <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        <Users size={16} style={{ display: 'inline', marginRight: 8 }} />
                        Co-Investors
                    </h3>
                    {coInvestors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {coInvestors.map((name: string, i: number) => (
                                <span key={i} className="badge badge-blue" style={{ fontSize: '12px', padding: '4px 12px' }}>
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                            No co-investors listed.
                            <br />
                            <span className="text-xs">Edit the startup to add co-investors.</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function DilutionTab({ startup }: { startup: any }) {
    const dilutionEvents = startup.dilutionEvents || [];

    // Build valuation timeline from cashflows
    const valuationTimeline = (startup.cashflows || [])
        .filter((cf: any) => cf.valuationAtTime)
        .map((cf: any) => ({
            name: formatDate(cf.date),
            valuation: paiseToRupees(cf.valuationAtTime),
        }));

    return (
        <div className="space-y-6">
            {/* Valuation Timeline Chart */}
            {valuationTimeline.length > 1 && (
                <div className="card" style={{ padding: '24px' }}>
                    <h3 className="text-base font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                        Valuation Timeline
                    </h3>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <LineChart data={valuationTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,0.08)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-navy-2, #0C1624)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-primary)' }}
                                    formatter={(v: number | undefined) => formatCurrencyCompact(v ?? 0)}
                                    labelStyle={{ color: 'var(--color-text-muted)' }}
                                />
                                <Line type="monotone" dataKey="valuation" stroke="#A78BFA" strokeWidth={2.5} dot={{ fill: '#A78BFA', r: 4, stroke: '#0B1221', strokeWidth: 2 }} name="Valuation" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Dilution Events Table */}
            {dilutionEvents.length > 0 ? (
                <div className="card" style={{ padding: 0 }}>
                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            Dilution Events
                        </h3>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 20px' }}>Round</th>
                                <th style={{ padding: '12px 20px' }}>Date</th>
                                <th style={{ padding: '12px 20px' }}>Pre-Dilution %</th>
                                <th style={{ padding: '12px 20px' }}>Post-Dilution %</th>
                                <th style={{ padding: '12px 20px' }}>Change</th>
                                <th style={{ padding: '12px 20px' }}>Valuation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dilutionEvents.map((de: any) => {
                                const change = de.postDilutionEquity - de.preDilutionEquity;
                                return (
                                    <tr key={de.id}>
                                        <td className="text-sm font-medium" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>{de.roundName}</td>
                                        <td className="text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-secondary)' }}>{formatDate(de.date)}</td>
                                        <td className="font-mono text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>{de.preDilutionEquity.toFixed(2)}%</td>
                                        <td className="font-mono text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>{de.postDilutionEquity.toFixed(2)}%</td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <span className={`font-mono text-sm font-semibold ${change >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="font-mono text-sm" style={{ padding: '12px 20px', color: 'var(--color-text-primary)' }}>
                                            {de.roundValuation ? formatCurrencyCompact(paiseToRupees(de.roundValuation)) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                    No dilution events recorded yet
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Modals
   ═══════════════════════════════════════════════════════════════ */

function MonthlyUpdateModal({ onClose, onSubmit, isLoading }: any) {
    const [form, setForm] = useState({ month: '', revenue: '', burnRate: '', cashBalance: '', notes: '', headcount: '', keyWins: '', keyChallenges: '', helpNeeded: '' });
    const runway = form.burnRate && form.cashBalance ?
        (parseFloat(form.cashBalance) <= 0 ? 0 : parseFloat(form.burnRate) === 0 ? Infinity : (parseFloat(form.cashBalance) / parseFloat(form.burnRate))) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Monthly Update</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <form onSubmit={e => {
                    e.preventDefault();
                    onSubmit({
                        ...form,
                        revenue: parseFloat(form.revenue),
                        burnRate: parseFloat(form.burnRate),
                        cashBalance: parseFloat(form.cashBalance),
                        headcount: form.headcount ? parseInt(form.headcount) : undefined,
                    });
                }} className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Cash Balance (₹) *</label>
                            <input type="number" className="input" value={form.cashBalance} onChange={e => setForm({ ...form, cashBalance: e.target.value })} required step="any" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Team Headcount</label>
                            <input type="number" className="input" value={form.headcount} onChange={e => setForm({ ...form, headcount: e.target.value })} min="0" placeholder="e.g. 25" />
                        </div>
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
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Key Wins / Milestones</label>
                        <textarea className="input" rows={2} value={form.keyWins} onChange={e => setForm({ ...form, keyWins: e.target.value })} placeholder="Product launches, partnerships, revenue milestones..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Key Challenges</label>
                        <textarea className="input" rows={2} value={form.keyChallenges} onChange={e => setForm({ ...form, keyChallenges: e.target.value })} placeholder="Hiring difficulties, market headwinds, churn..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Help Needed from Investor</label>
                        <textarea className="input" rows={2} value={form.helpNeeded} onChange={e => setForm({ ...form, helpNeeded: e.target.value })} placeholder="Introductions, strategic advice, follow-on funding..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>General Notes</label>
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
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
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
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
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

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'] as const;
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'] as const;

function EditStartupModal({ startup, onClose, onSubmit, isLoading }: { startup: any; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({
        name: startup.name || '',
        sector: startup.sector || '',
        stage: startup.stage || '',
        description: startup.description || '',
        website: startup.website || '',
        founderName: startup.founderName || '',
        founderEmail: startup.founderEmail || '',
        coInvestors: startup.coInvestors || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Only send changed fields
        const changes: Record<string, string> = {};
        for (const [key, value] of Object.entries(form)) {
            if (value !== (startup[key] || '')) {
                changes[key] = value;
            }
        }
        if (Object.keys(changes).length === 0) {
            onClose();
            return;
        }
        onSubmit(changes);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Edit Startup</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Company Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Sector *</label>
                            <select className="select" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                                {SECTORS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Stage *</label>
                            <select className="select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                                {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                        <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the company..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Website</label>
                        <input className="input" type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Founder Name</label>
                            <input className="input" value={form.founderName} onChange={e => setForm({ ...form, founderName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Founder Email</label>
                            <input className="input" type="email" value={form.founderEmail} onChange={e => setForm({ ...form, founderEmail: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Co-Investors</label>
                        <input className="input" value={form.coInvestors} onChange={e => setForm({ ...form, coInvestors: e.target.value })} placeholder="Comma-separated names" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">{isLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function WriteOffConfirmDialog({ startupName, onClose, onConfirm, isLoading }: { startupName: string; onClose: () => void; onConfirm: () => void; isLoading: boolean }) {
    const [confirmText, setConfirmText] = useState('');
    const isConfirmed = confirmText === 'WRITE OFF';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-red, #ef4444)' }}>Write Off Startup</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-red, #ef4444)' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            You are about to write off <strong>{startupName}</strong>. This sets the investment status to "Written Off" and marks it as a total loss for metrics calculation.
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Type <strong style={{ color: 'var(--color-red, #ef4444)', fontFamily: 'var(--font-mono, monospace)' }}>WRITE OFF</strong> to confirm
                    </label>
                    <input
                        className="input"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder="WRITE OFF"
                        autoFocus
                    />
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={!isConfirmed || isLoading}
                        className="btn flex-1"
                        style={{
                            background: isConfirmed ? 'var(--color-red, #ef4444)' : 'rgba(239,68,68,0.3)',
                            color: '#fff',
                            cursor: isConfirmed ? 'pointer' : 'not-allowed',
                            opacity: isConfirmed ? 1 : 0.5,
                        }}
                    >
                        {isLoading ? 'Writing Off...' : 'Write Off Startup'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const CF_TYPES = [
    { value: 'investment', label: 'Investment (outflow)' },
    { value: 'follow_on', label: 'Follow-On (outflow)' },
    { value: 'exit', label: 'Exit (inflow)' },
    { value: 'correction', label: 'Correction (manual)' },
] as const;

function AddCashflowModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({ amount: '', date: '', type: 'correction', roundName: '', notes: '', reason: '' });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Ledger Entry</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: parseFloat(form.amount) }); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Type *</label>
                            <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Amount (₹) *</label>
                            <input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" step="any" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
                            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Round Name</label>
                            <input className="input" value={form.roundName} onChange={e => setForm({ ...form, roundName: e.target.value })} placeholder="e.g. Series A" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Reason for Entry</label>
                        <input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Recorded in audit trail" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">{isLoading ? 'Adding...' : 'Add Entry'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditCashflowModal({ cashflow, onClose, onSubmit, isLoading }: { cashflow: any; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({
        amount: String(paiseToRupees(Math.abs(cashflow.amount))),
        date: cashflow.date ? new Date(cashflow.date).toISOString().split('T')[0] : '',
        type: cashflow.type || 'correction',
        roundName: cashflow.roundName || '',
        notes: cashflow.notes || '',
        reason: '',
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Edit Cashflow</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: parseFloat(form.amount), reason: form.reason }); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                            <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Amount (₹)</label>
                            <input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="0" step="any" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
                            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Round Name</label>
                            <input className="input" value={form.roundName} onChange={e => setForm({ ...form, roundName: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-red, #ef4444)' }}>Reason for Change *</label>
                        <input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required placeholder="Required — recorded in audit trail" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={isLoading || !form.reason.trim()} className="btn btn-primary flex-1">{isLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteCashflowConfirm({ cashflow, onClose, onConfirm, isLoading }: { cashflow: any; onClose: () => void; onConfirm: (reason: string) => void; isLoading: boolean }) {
    const [reason, setReason] = useState('');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-red, #ef4444)' }}>Delete Cashflow Entry</h2>
                    <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-red, #ef4444)' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            Deleting this <strong>{cashflow.type?.replace('_', ' ')}</strong> entry of <strong>{formatCurrencyCompact(paiseToRupees(Math.abs(cashflow.amount)))}</strong> will permanently remove it and recompute all metrics.
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Reason for deletion <span style={{ color: 'var(--color-red, #ef4444)' }}>*</span>
                    </label>
                    <input
                        className="input"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Required — recorded in audit trail"
                        autoFocus
                    />
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || isLoading}
                        className="btn flex-1"
                        style={{
                            background: reason.trim() ? 'var(--color-red, #ef4444)' : 'rgba(239,68,68,0.3)',
                            color: '#fff',
                            cursor: reason.trim() ? 'pointer' : 'not-allowed',
                            opacity: reason.trim() ? 1 : 0.5,
                        }}
                    >
                        {isLoading ? 'Deleting...' : 'Delete Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
}
