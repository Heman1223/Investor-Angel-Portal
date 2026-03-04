import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Plus, DoorOpen, TrendingUp, X, AlertTriangle,
    Share2, Edit3, Calendar, ChevronRight, Download,
    Users, StickyNote, Send, ChevronDown, Trash2,
    ArrowUpRight, BarChart2, FileText,
    GitBranch, Activity
} from 'lucide-react';
import { startupsAPI, updatesAPI, documentsAPI, cashflowsAPI } from '../services/api';
import {
    formatCurrencyCompact, formatPercent, formatDate,
    formatMonth, formatRunway, paiseToRupees
} from '../utils/formatters';
import { invalidateInvestmentQueries } from '../utils/invalidation';
import toast from 'react-hot-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

type TabId = 'overview' | 'cashflows' | 'updates' | 'documents' | 'notes' | 'dilution';

const STAGE_CFG: Record<string, { bg: string; color: string; border: string }> = {
    'Pre-Seed': { bg: 'rgba(167,139,250,.09)', color: '#a78bfa', border: 'rgba(167,139,250,.22)' },
    'Seed': { bg: 'rgba(251,191,36,.09)', color: '#fbbf24', border: 'rgba(251,191,36,.22)' },
    'Series A': { bg: 'rgba(52,211,153,.09)', color: '#34d399', border: 'rgba(52,211,153,.22)' },
    'Series B': { bg: 'rgba(96,165,250,.09)', color: '#60a5fa', border: 'rgba(96,165,250,.22)' },
    'Series C': { bg: 'rgba(249,115,22,.09)', color: '#f97316', border: 'rgba(249,115,22,.22)' },
    'Growth': { bg: 'rgba(197,164,84,.09)', color: '#C5A454', border: 'rgba(197,164,84,.22)' },
    'Pre-IPO': { bg: 'rgba(236,72,153,.09)', color: '#ec4899', border: 'rgba(236,72,153,.22)' },
};

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'] as const;
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'] as const;

/* ── Count-up hook ── */
function useCountUp(target: number, dur = 1000, delay = 0) {
    const [v, setV] = useState(0);
    useEffect(() => {
        let id: any;
        const t0 = performance.now() + delay;
        const tick = (now: number) => {
            if (now < t0) { id = requestAnimationFrame(tick); return; }
            const p = Math.min((now - t0) / dur, 1);
            setV(Math.round(target * (1 - Math.pow(1 - p, 4))));
            if (p < 1) id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, [target, dur, delay]);
    return v;
}

export default function StartupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabId>('overview');
    const [showUpdate, setShowUpdate] = useState(false);
    const [showExit, setShowExit] = useState(false);
    const [showFollowOn, setShowFollowOn] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showWriteOff, setShowWriteOff] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

    const { data: startup, isLoading } = useQuery({
        queryKey: ['startup', id],
        queryFn: async () => (await startupsAPI.getById(id!)).data.data,
        enabled: !!id,
    });
    const { data: updates } = useQuery({
        queryKey: ['updates', id],
        queryFn: async () => (await updatesAPI.getForStartup(id!)).data.data,
        enabled: !!id,
    });
    const { data: documents } = useQuery({
        queryKey: ['startup-documents', id],
        queryFn: () => documentsAPI.getForStartup(id!).then(r => r.data.data),
        enabled: !!id,
    });

    const handleDownload = async (docId: string, fileName: string) => {
        try {
            const r = await documentsAPI.downloadRawFile(docId);
            const blob = new Blob([r.data], { type: r.headers['content-type'] });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch { toast.error('Failed to download'); }
    };

    const updateMut = useMutation({ mutationFn: (d: any) => updatesAPI.create(id!, d), onSuccess: () => { invalidateInvestmentQueries(qc, id); setShowUpdate(false); toast.success('Update submitted'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const exitMut = useMutation({ mutationFn: (d: any) => startupsAPI.recordExit(id!, d), onSuccess: () => { invalidateInvestmentQueries(qc, id); setShowExit(false); toast.success('Exit recorded'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const followOnMut = useMutation({ mutationFn: (d: any) => startupsAPI.addFollowOn(id!, d), onSuccess: () => { invalidateInvestmentQueries(qc, id); setShowFollowOn(false); toast.success('Follow-on recorded'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const noteMut = useMutation({ mutationFn: (text: string) => startupsAPI.addNote(id!, text), onSuccess: () => { invalidateInvestmentQueries(qc, id); toast.success('Note added'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const editMut = useMutation({ mutationFn: (d: any) => startupsAPI.update(id!, d), onSuccess: () => { invalidateInvestmentQueries(qc, id); setShowEdit(false); toast.success('Startup updated'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const writeOffMut = useMutation({ mutationFn: () => startupsAPI.delete(id!), onSuccess: () => { invalidateInvestmentQueries(qc, id); setShowWriteOff(false); toast.success('Written off'); navigate('/portfolio'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });

    /* ── Loading skeleton ── */
    if (isLoading) return (
        <><SD />
            <div className="sd-skel-root">
                <div className="sd-skel-hd"><div className="sd-skel-av" /><div><div className="sd-skel-line w-48 h-8" /><div className="sd-skel-line w-32 h-4 mt-2" /></div></div>
                <div className="sd-skel-stats">{[1, 2, 3, 4].map(i => <div key={i} className="sd-skel-card" />)}</div>
                <div className="sd-skel-line w-full h-10" />
            </div></>
    );

    if (!startup) return <><SD /><div className="sd-not-found">Startup not found</div></>;

    const s = startup, m = s.metrics;
    const sc = STAGE_CFG[s.stage] || { bg: 'rgba(255,255,255,.06)', color: '#7d8fa6', border: 'rgba(255,255,255,.1)' };
    const hue = s.name.charCodeAt(0) * 13;

    const tabs: { id: TabId; label: string; icon: any }[] = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'cashflows', label: 'Cashflows', icon: BarChart2 },
        { id: 'updates', label: 'Monthly Updates', icon: TrendingUp },
        { id: 'notes', label: 'Notes', icon: StickyNote },
        { id: 'dilution', label: 'Dilution', icon: GitBranch },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    return (
        <>
            <SD />
            <div className={`sd${mounted ? ' sd--in' : ''}`} onClick={() => setShowManage(false)}>

                {/* ── Breadcrumb ── */}
                <nav className="sd-breadcrumb">
                    <Link to="/portfolio" className="sd-bc-link">Portfolio</Link>
                    <ChevronRight size={12} className="sd-bc-sep" />
                    <span className="sd-bc-muted">{s.sector}</span>
                    <ChevronRight size={12} className="sd-bc-sep" />
                    <span className="sd-bc-active">{s.name}</span>
                </nav>

                {/* ── Company Header ── */}
                <header className="sd-header">
                    <div className="sd-header-identity">
                        <div className="sd-avatar-wrap">
                            <div className="sd-avatar" style={{ background: `hsl(${hue},38%,14%)`, color: `hsl(${hue},55%,65%)`, border: `1px solid hsl(${hue},38%,22%)` }}>
                                {s.name.charAt(0)}
                            </div>
                            <div className={`sd-av-status ${s.status === 'active' ? 'active' : s.status === 'exited' ? 'exited' : 'writeoff'}`} />
                        </div>
                        <div className="sd-header-info">
                            <div className="sd-header-name-row">
                                <h1 className="sd-company-name">{s.name}</h1>
                                <span className="sd-stage-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{s.stage}</span>
                                <StatusChip status={s.status} />
                            </div>
                            {s.description && <p className="sd-description">{s.description}</p>}
                            <div className="sd-meta-row">
                                <span className="sd-meta-item"><span className="sd-meta-dot" style={{ background: '#C5A454' }} />{s.sector}</span>
                                <span className="sd-meta-div" />
                                <span className="sd-meta-item"><Calendar size={11} />{formatDate(s.investmentDate)}</span>
                                {s.founderName && <><span className="sd-meta-div" /><span className="sd-meta-item"><Users size={11} />{s.founderName}</span></>}
                            </div>
                        </div>
                    </div>

                    {s.status === 'active' && (
                        <div className="sd-header-actions" onClick={e => e.stopPropagation()}>
                            <button className="sd-ghost-btn" title="Share">
                                <Share2 size={13} /> Share
                            </button>
                            <div className="sd-manage-wrap">
                                <button className="sd-gold-btn" onClick={() => setShowManage(v => !v)}>
                                    <Edit3 size={13} /> Manage <ChevronDown size={11} />
                                </button>
                                {showManage && (
                                    <div className="sd-manage-menu">
                                        <button className="sd-mm-item" onClick={() => { setShowManage(false); setShowEdit(true); }}>
                                            <Edit3 size={13} /> Edit Startup
                                        </button>
                                        <button className="sd-mm-item" onClick={() => { setShowManage(false); setShowFollowOn(true); }}>
                                            <TrendingUp size={13} /> Add Follow-On
                                        </button>
                                        <button className="sd-mm-item" onClick={() => { setShowManage(false); setShowUpdate(true); }}>
                                            <Plus size={13} /> Add Update
                                        </button>
                                        <div className="sd-mm-div" />
                                        <button className="sd-mm-item danger" onClick={() => { setShowManage(false); setShowExit(true); }}>
                                            <DoorOpen size={13} /> Record Exit
                                        </button>
                                        <button className="sd-mm-item danger" onClick={() => { setShowManage(false); setShowWriteOff(true); }}>
                                            <Trash2 size={13} /> Write Off
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </header>

                {/* ── Stat Cards ── */}
                <div className="sd-stats">
                    {[
                        { lbl: 'Total Invested', raw: paiseToRupees(m.invested), fmt: (x: number) => formatCurrencyCompact(x), sub: s.cashflows?.length > 1 ? 'Initial + Follow-on' : 'Initial investment', accent: '#C5A454', idx: 0 },
                        { lbl: 'Current Value', raw: paiseToRupees(m.currentValue), fmt: (x: number) => formatCurrencyCompact(x), sub: m.currentValue > m.invested ? `↑ +${formatPercent((m.currentValue - m.invested) / m.invested)}` : '—', accent: m.currentValue >= m.invested ? '#34d399' : '#f87171', subColor: m.currentValue >= m.invested ? '#34d399' : '#f87171', idx: 1 },
                        { lbl: 'Multiple (MOIC)', raw: m.moic * 100, fmt: (x: number) => `${(x / 100).toFixed(2)}×`, sub: m.moic >= 1 ? `↑ +${(m.moic - 1).toFixed(1)}× vs invested` : `↓ ${(m.moic - 1).toFixed(1)}× below par`, accent: m.moic >= 1 ? '#C5A454' : '#f87171', subColor: m.moic >= 1 ? '#C5A454' : '#f87171', idx: 2 },
                        { lbl: 'Net IRR', raw: Math.abs((m.xirr || 0) * 100), fmt: (x: number) => `${(m.xirr || 0) < 0 ? '-' : ''}${(x).toFixed(1)}%`, sub: (m.xirr || 0) > 0 ? '↑ Top decile performance' : '—', accent: (m.xirr || 0) >= 0 ? '#34d399' : '#f87171', subColor: (m.xirr || 0) >= 0 ? '#34d399' : '#f87171', idx: 3 },
                    ].map(c => (
                        <div key={c.lbl} className="sd-stat" style={{ '--ac': c.accent, '--idx': c.idx } as any}>
                            <div className="sd-stat-shine" />
                            <div className="sd-stat-lbl">{c.lbl}</div>
                            <div className="sd-stat-val">
                                {(() => { const v = useCountUp(c.raw, 900, c.idx * 80); return c.fmt(v); })()}
                            </div>
                            <div className="sd-stat-sub" style={{ color: (c as any).subColor || 'var(--t3)' }}>{c.sub}</div>
                            <div className="sd-stat-bar"><div className="sd-stat-bar-fill" /></div>
                            <svg className="sd-stat-arc" viewBox="0 0 60 60" fill="none">
                                <circle cx="60" cy="0" r="40" stroke="var(--ac)" strokeWidth="1" strokeDasharray="4 8" opacity=".25" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="sd-tabs">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} className={`sd-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                                <Icon size={12} />
                                <span>{t.label}</span>
                                {tab === t.id && <div className="sd-tab-indicator" />}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ── */}
                <div className="sd-tab-body">
                    {tab === 'overview' && <OverviewTab startup={s} updates={updates} documents={documents} handleDownload={handleDownload} />}
                    {tab === 'cashflows' && <CashflowsTab startup={s} />}
                    {tab === 'updates' && <UpdatesTab updates={updates} onAddUpdate={() => setShowUpdate(true)} isActive={s.status === 'active'} />}
                    {tab === 'documents' && <DocumentsTab documents={documents || []} handleDownload={handleDownload} />}
                    {tab === 'notes' && <NotesTab startup={s} onAddNote={(t: string) => noteMut.mutate(t)} isLoading={noteMut.isPending} />}
                    {tab === 'dilution' && <DilutionTab startup={s} />}
                </div>
            </div>

            {/* Modals */}
            {showUpdate && <MonthlyUpdateModal onClose={() => setShowUpdate(false)} onSubmit={(d: any) => updateMut.mutate(d)} isLoading={updateMut.isPending} />}
            {showExit && <ExitModal onClose={() => setShowExit(false)} onSubmit={(d: any) => exitMut.mutate(d)} isLoading={exitMut.isPending} />}
            {showFollowOn && <FollowOnModal onClose={() => setShowFollowOn(false)} onSubmit={(d: any) => followOnMut.mutate(d)} isLoading={followOnMut.isPending} />}
            {showEdit && <EditStartupModal startup={s} onClose={() => setShowEdit(false)} onSubmit={(d: any) => editMut.mutate(d)} isLoading={editMut.isPending} />}
            {showWriteOff && <WriteOffConfirmDialog startupName={s.name} onClose={() => setShowWriteOff(false)} onConfirm={() => writeOffMut.mutate()} isLoading={writeOffMut.isPending} />}
        </>
    );
}

/* ── Status Chip ── */
function StatusChip({ status }: { status: string }) {
    const C: any = {
        active: { bg: 'rgba(52,211,153,.1)', fg: '#34d399', lbl: 'Active' },
        exited: { bg: 'rgba(148,163,184,.1)', fg: '#94a3b8', lbl: 'Exited' },
        written_off: { bg: 'rgba(248,113,113,.1)', fg: '#f87171', lbl: 'Written Off' },
    };
    const c = C[status] || C.exited;
    return (
        <span className="sd-chip" style={{ background: c.bg, color: c.fg }}>
            <span className={`sd-chip-dot${status === 'active' ? ' pulse' : ''}`} style={{ background: c.fg }} />
            {c.lbl}
        </span>
    );
}

/* ═══ OVERVIEW TAB ═══ */
function OverviewTab({ startup, updates, documents, handleDownload }: any) {
    const s = startup;
    const chartData = s.cashflows?.map((cf: any) => ({
        name: formatDate(cf.date),
        value: paiseToRupees(Math.abs(cf.amount)),
    })) || [];

    return (
        <div className="sd-overview-grid">
            {/* Left */}
            <div className="sd-ov-left">
                {/* Performance Chart */}
                <div className="sd-card">
                    <div className="sd-card-hd">
                        <h3 className="sd-card-title">Performance History</h3>
                        <select className="sd-select-sm">
                            <option>Last 12 Months</option>
                            <option>All Time</option>
                        </select>
                    </div>
                    <div className="sd-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="perfG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C5A454" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#C5A454" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,.07)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#3d4f63', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#3d4f63', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                <Tooltip contentStyle={{ background: '#0b1825', border: '1px solid rgba(197,164,84,.2)', borderRadius: 10, fontSize: 12, color: '#ede8db', padding: '8px 14px' }} formatter={(v: any) => [formatCurrencyCompact(v), 'Amount']} />
                                <Area type="monotone" dataKey="value" stroke="#C5A454" fill="url(#perfG)" strokeWidth={2} dot={{ fill: '#C5A454', r: 3, stroke: '#07111d', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transactions */}
                <div className="sd-card sd-card-flush">
                    <div className="sd-card-hd-flush">
                        <h3 className="sd-card-title">Recent Transactions</h3>
                        <button className="sd-link-btn">View All <ArrowUpRight size={11} /></button>
                    </div>
                    <table className="sd-table">
                        <thead><tr>
                            <th>Date</th><th>Type</th><th>Round</th><th className="nr">Amount</th>
                        </tr></thead>
                        <tbody>
                            {s.cashflows?.slice(0, 5).map((cf: any) => (
                                <tr key={cf._id}>
                                    <td className="mono">{formatDate(cf.date)}</td>
                                    <td><span className="sd-type-badge" style={{ background: cf.amount < 0 ? 'rgba(52,211,153,.1)' : 'rgba(96,165,250,.1)', color: cf.amount < 0 ? '#34d399' : '#60a5fa' }}>{cf.type.replace('_', ' ')}</span></td>
                                    <td className="muted">{cf.roundName || '—'}</td>
                                    <td className="nr mono semi">{formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right */}
            <div className="sd-ov-right">
                {/* Latest Updates timeline */}
                <div className="sd-card">
                    <h3 className="sd-card-title" style={{ marginBottom: 20 }}>Latest Updates</h3>
                    {updates?.length > 0 ? (
                        <div className="sd-timeline">
                            {updates.slice(0, 3).map((u: any, i: number) => (
                                <div key={u._id} className={`sd-tl-item${i < 2 ? ' has-line' : ''}`}>
                                    <div className="sd-tl-dot" style={{ background: i === 0 ? '#C5A454' : 'var(--bd)', boxShadow: i === 0 ? '0 0 8px rgba(197,164,84,.4)' : 'none' }} />
                                    <div className="sd-tl-content">
                                        <div className="sd-tl-month">{formatMonth(u.month)}</div>
                                        <div className="sd-tl-rev">Revenue: {formatCurrencyCompact(paiseToRupees(u.revenue))}</div>
                                        <div className="sd-tl-meta">Burn: {formatCurrencyCompact(paiseToRupees(u.burnRate))} · Runway: {formatRunway(u.runwayMonths)}</div>
                                        {u.notes && <div className="sd-tl-notes">{u.notes}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="sd-empty-text">No updates yet</p>}
                </div>

                {/* Documents */}
                <div className="sd-card">
                    <h3 className="sd-card-title" style={{ marginBottom: 16 }}>Key Documents</h3>
                    {documents?.length > 0 ? (
                        <div className="sd-docs-list">
                            {documents.slice(0, 3).map((doc: any) => {
                                const ext = doc.fileName.split('.').pop()?.toUpperCase() || 'DOC';
                                const isPdf = doc.fileName.endsWith('.pdf');
                                return (
                                    <div key={doc._id} className="sd-doc-row">
                                        <div className="sd-doc-icon" style={{ background: isPdf ? 'rgba(248,113,113,.12)' : 'rgba(96,165,250,.12)', color: isPdf ? '#f87171' : '#60a5fa' }}>{ext}</div>
                                        <div className="sd-doc-info">
                                            <p className="sd-doc-name">{doc.fileName}</p>
                                            <p className="sd-doc-meta">{formatDate(doc.uploadedAt || doc.createdAt)} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button className="sd-dl-btn" onClick={() => handleDownload(doc._id || doc.id, doc.fileName)}><Download size={13} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="sd-empty-text">No documents uploaded</p>}
                </div>

                {/* Contact */}
                {s.founderName && (
                    <div className="sd-card">
                        <h3 className="sd-card-title" style={{ marginBottom: 14 }}>Founder</h3>
                        <div className="sd-founder-row">
                            <div className="sd-founder-av" style={{ background: `hsl(${s.founderName.charCodeAt(0) * 13},38%,14%)`, color: `hsl(${s.founderName.charCodeAt(0) * 13},55%,65%)`, border: `1px solid hsl(${s.founderName.charCodeAt(0) * 13},38%,22%)` }}>
                                {s.founderName.charAt(0)}
                            </div>
                            <div className="sd-founder-info">
                                <p className="sd-founder-name">{s.founderName}</p>
                                <p className="sd-founder-role">CEO & Co-Founder</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══ CASHFLOWS TAB ═══ */
function CashflowsTab({ startup }: { startup: any }) {
    const qc = useQueryClient();
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [deleting, setDeleting] = useState<any>(null);
    const addMut = useMutation({ mutationFn: (d: any) => cashflowsAPI.add(startup.id, d), onSuccess: () => { invalidateInvestmentQueries(qc, startup.id); setShowAdd(false); toast.success('Cashflow added'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const editMut = useMutation({ mutationFn: ({ cfId, data }: { cfId: string; data: any }) => cashflowsAPI.update(startup.id, cfId, data), onSuccess: () => { invalidateInvestmentQueries(qc, startup.id); setEditing(null); toast.success('Updated'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
    const delMut = useMutation({ mutationFn: ({ cfId, reason }: { cfId: string; reason: string }) => cashflowsAPI.delete(startup.id, cfId, reason), onSuccess: () => { invalidateInvestmentQueries(qc, startup.id); setDeleting(null); toast.success('Deleted'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });

    return (
        <div className="sd-card sd-card-flush">
            <div className="sd-card-hd-flush">
                <h3 className="sd-card-title">Transaction Ledger</h3>
                <button className="sd-gold-btn sm" onClick={() => setShowAdd(true)}><Plus size={12} /> Add Entry</button>
            </div>
            <table className="sd-table">
                <thead><tr><th>Date</th><th>Type</th><th className="nr">Amount</th><th>Round</th><th>Notes</th><th /></tr></thead>
                <tbody>
                    {startup.cashflows?.map((cf: any) => (
                        <tr key={cf.id || cf._id}>
                            <td className="mono">{formatDate(cf.date)}</td>
                            <td><span className="sd-type-badge" style={{ background: cf.amount < 0 ? 'rgba(52,211,153,.1)' : 'rgba(96,165,250,.1)', color: cf.amount < 0 ? '#34d399' : '#60a5fa' }}>{cf.type.replace('_', ' ')}</span></td>
                            <td className={`nr mono semi${cf.amount < 0 ? ' red' : ' green'}`}>{cf.amount < 0 ? '-' : '+'}{formatCurrencyCompact(paiseToRupees(Math.abs(cf.amount)))}</td>
                            <td className="muted">{cf.roundName || '—'}</td>
                            <td className="muted xs">{cf.notes || '—'}</td>
                            <td>
                                <div className="sd-row-acts">
                                    <button className="sd-act-btn" onClick={() => setEditing(cf)}><Edit3 size={12} /></button>
                                    <button className="sd-act-btn red" onClick={() => setDeleting(cf)}><Trash2 size={12} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {(!startup.cashflows || !startup.cashflows.length) && (
                        <tr><td colSpan={6} className="sd-table-empty">No cashflow entries</td></tr>
                    )}
                </tbody>
            </table>
            {showAdd && <AddCashflowModal onClose={() => setShowAdd(false)} onSubmit={(d: any) => addMut.mutate(d)} isLoading={addMut.isPending} />}
            {editing && <EditCashflowModal cashflow={editing} onClose={() => setEditing(null)} onSubmit={(d: any) => editMut.mutate({ cfId: editing.id || editing._id, data: d })} isLoading={editMut.isPending} />}
            {deleting && <DeleteCashflowConfirm cashflow={deleting} onClose={() => setDeleting(null)} onConfirm={(r: string) => delMut.mutate({ cfId: deleting.id || deleting._id, reason: r })} isLoading={delMut.isPending} />}
        </div>
    );
}

/* ═══ UPDATES TAB ═══ */
function UpdatesTab({ updates, onAddUpdate, isActive }: any) {
    return (
        <div className="sd-updates-wrap">
            {isActive && (
                <div className="sd-tab-action-bar">
                    <button className="sd-gold-btn" onClick={onAddUpdate}><Plus size={13} /> Add Update</button>
                </div>
            )}
            {updates?.length > 0 ? (
                <div className="sd-card sd-card-flush">
                    <table className="sd-table">
                        <thead><tr><th>Month</th><th>Revenue</th><th>Burn</th><th>Cash</th><th>Runway</th><th>Notes</th></tr></thead>
                        <tbody>
                            {updates.map((u: any) => (
                                <tr key={u._id}>
                                    <td className="semi">{formatMonth(u.month)}</td>
                                    <td className="mono">{formatCurrencyCompact(paiseToRupees(u.revenue))}</td>
                                    <td className="mono">{formatCurrencyCompact(paiseToRupees(u.burnRate))}</td>
                                    <td className="mono">{formatCurrencyCompact(paiseToRupees(u.cashBalance))}</td>
                                    <td>
                                        <span className="mono semi" style={{ color: u.runwayMonths < 3 ? '#f87171' : u.runwayMonths < 6 ? '#fbbf24' : '#34d399' }}>
                                            {formatRunway(u.runwayMonths)}
                                        </span>
                                    </td>
                                    <td className="muted xs">{u.notes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="sd-empty-state">No monthly updates yet</div>
            )}
        </div>
    );
}

/* ═══ DOCUMENTS TAB ═══ */
function DocumentsTab({ documents, handleDownload }: { documents: any[]; handleDownload: any }) {
    if (!documents.length) return <div className="sd-empty-state">No documents uploaded yet</div>;
    return (
        <div className="sd-docs-grid">
            {documents.map((doc: any) => {
                const ext = doc.fileName.split('.').pop()?.toUpperCase() || 'DOC';
                const isPdf = doc.fileName.endsWith('.pdf');
                return (
                    <div key={doc._id} className="sd-doc-card">
                        <div className="sd-doc-icon lg" style={{ background: isPdf ? 'rgba(248,113,113,.12)' : 'rgba(96,165,250,.12)', color: isPdf ? '#f87171' : '#60a5fa' }}>{ext}</div>
                        <div className="sd-doc-info">
                            <p className="sd-doc-name">{doc.fileName}</p>
                            <p className="sd-doc-meta">{formatDate(doc.uploadedAt || doc.createdAt)} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <button className="sd-dl-btn" onClick={() => handleDownload(doc._id || doc.id, doc.fileName)}><Download size={14} /></button>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══ NOTES TAB ═══ */
function NotesTab({ startup, onAddNote, isLoading }: any) {
    const [text, setText] = useState('');
    const notes: Array<{ text: string; createdAt: string }> = startup.notes || [];
    const coInvestors: string[] = startup.coInvestors ? startup.coInvestors.split(',').map((c: string) => c.trim()).filter(Boolean) : [];

    return (
        <div className="sd-notes-grid">
            <div className="sd-notes-main">
                <div className="sd-card">
                    <h3 className="sd-card-title" style={{ marginBottom: 14 }}><StickyNote size={14} style={{ display: 'inline', marginRight: 7 }} />Add Note</h3>
                    <div className="sd-note-compose">
                        <textarea className="sd-textarea" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Record thoughts, observations, or follow-up items…" />
                        <button className="sd-gold-btn" disabled={isLoading || !text.trim()} onClick={() => { if (text.trim()) { onAddNote(text.trim()); setText(''); } }}>
                            <Send size={13} /> {isLoading ? 'Adding…' : 'Add'}
                        </button>
                    </div>
                </div>
                {notes.length > 0 ? (
                    <div className="sd-notes-list">
                        {notes.map((n, i) => (
                            <div key={i} className="sd-note-card">
                                <p className="sd-note-text">{n.text}</p>
                                <p className="sd-note-date">{formatDate(n.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                ) : <div className="sd-empty-state" style={{ marginTop: 8 }}>No notes yet</div>}
            </div>
            <div className="sd-notes-side">
                <div className="sd-card">
                    <h3 className="sd-card-title" style={{ marginBottom: 14 }}><Users size={13} style={{ display: 'inline', marginRight: 7 }} />Co-Investors</h3>
                    {coInvestors.length > 0 ? (
                        <div className="sd-co-tags">
                            {coInvestors.map((name: string, i: number) => (
                                <span key={i} className="sd-co-tag">{name}</span>
                            ))}
                        </div>
                    ) : <p className="sd-empty-text" style={{ textAlign: 'left' }}>No co-investors listed</p>}
                </div>
            </div>
        </div>
    );
}

/* ═══ DILUTION TAB ═══ */
function DilutionTab({ startup }: { startup: any }) {
    const events = startup.dilutionEvents || [];
    const timeline = (startup.cashflows || []).filter((cf: any) => cf.valuationAtTime).map((cf: any) => ({
        name: formatDate(cf.date), valuation: paiseToRupees(cf.valuationAtTime),
    }));

    return (
        <div className="sd-updates-wrap">
            {timeline.length > 1 && (
                <div className="sd-card" style={{ marginBottom: 16 }}>
                    <h3 className="sd-card-title" style={{ marginBottom: 20 }}>Valuation Timeline</h3>
                    <div className="sd-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,164,84,.07)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#3d4f63', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#3d4f63', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                                <Tooltip contentStyle={{ background: '#0b1825', border: '1px solid rgba(197,164,84,.2)', borderRadius: 10, fontSize: 12, color: '#ede8db', padding: '8px 14px' }} formatter={(v: any) => [formatCurrencyCompact(v), 'Valuation']} />
                                <Line type="monotone" dataKey="valuation" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4, stroke: '#07111d', strokeWidth: 2 }} name="Valuation" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            {events.length > 0 ? (
                <div className="sd-card sd-card-flush">
                    <div className="sd-card-hd-flush"><h3 className="sd-card-title">Dilution Events</h3></div>
                    <table className="sd-table">
                        <thead><tr><th>Round</th><th>Date</th><th className="nr">Pre %</th><th className="nr">Post %</th><th className="nr">Change</th><th className="nr">Valuation</th></tr></thead>
                        <tbody>
                            {events.map((de: any) => {
                                const chg = de.postDilutionEquity - de.preDilutionEquity;
                                return (
                                    <tr key={de.id}>
                                        <td className="semi">{de.roundName}</td>
                                        <td className="muted mono">{formatDate(de.date)}</td>
                                        <td className="nr mono">{de.preDilutionEquity.toFixed(2)}%</td>
                                        <td className="nr mono">{de.postDilutionEquity.toFixed(2)}%</td>
                                        <td className={`nr mono semi ${chg >= 0 ? 'green' : 'red'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</td>
                                        <td className="nr mono">{de.roundValuation ? formatCurrencyCompact(paiseToRupees(de.roundValuation)) : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : <div className="sd-empty-state">No dilution events recorded yet</div>}
        </div>
    );
}

/* ═══════════════ MODALS ═══════════════ */

function Modal({ title, onClose, children, danger }: any) {
    return (
        <div className="sd-ov" onClick={onClose}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
                <div className="sd-modal-hd">
                    <span className="sd-modal-title" style={{ color: danger ? '#f87171' : undefined }}>{title}</span>
                    <button className="sd-modal-x" onClick={onClose}><X size={15} /></button>
                </div>
                <div className="sd-modal-body">{children}</div>
            </div>
        </div>
    );
}

function MF({ label, req, children }: any) {
    return (
        <div className="sd-mf">
            <label className="sd-ml">{label}{req && <span className="sd-mreq">*</span>}</label>
            {children}
        </div>
    );
}

function ModalFooter({ onClose, onSubmit, loading, label, danger }: any) {
    return (
        <div className="sd-modal-ft">
            <button className="sd-ghost-btn" onClick={onClose}>Cancel</button>
            <button className="sd-gold-btn" disabled={loading} onClick={onSubmit}
                style={danger ? { background: '#ef4444', boxShadow: '0 4px 16px rgba(239,68,68,.25)' } : undefined}>
                {loading ? 'Saving…' : label}
            </button>
        </div>
    );
}

function MonthlyUpdateModal({ onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ month: '', revenue: '', burnRate: '', cashBalance: '', notes: '', headcount: '', keyWins: '', keyChallenges: '', helpNeeded: '' });
    const runway = f.burnRate && f.cashBalance ? (parseFloat(f.cashBalance) <= 0 ? 0 : parseFloat(f.burnRate) === 0 ? Infinity : parseFloat(f.cashBalance) / parseFloat(f.burnRate)) : null;
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    return (
        <Modal title="Add Monthly Update" onClose={onClose}>
            <div className="sd-form-grid">
                <MF label="Month" req><input type="month" className="sd-inp" value={f.month} onChange={U('month')} required /></MF>
                <div className="sd-r2">
                    <MF label="Revenue (₹)" req><input type="number" className="sd-inp" value={f.revenue} onChange={U('revenue')} required min="0" /></MF>
                    <MF label="Burn Rate (₹)" req><input type="number" className="sd-inp" value={f.burnRate} onChange={U('burnRate')} required min="0" /></MF>
                </div>
                <div className="sd-r2">
                    <MF label="Cash Balance (₹)" req><input type="number" className="sd-inp" value={f.cashBalance} onChange={U('cashBalance')} required /></MF>
                    <MF label="Headcount"><input type="number" className="sd-inp" value={f.headcount} onChange={U('headcount')} min="0" placeholder="e.g. 25" /></MF>
                </div>
                {runway !== null && (
                    <div className="sd-runway-hint">
                        <span>Estimated Runway</span>
                        <span className="mono semi" style={{ color: runway < 3 ? '#f87171' : runway < 6 ? '#fbbf24' : '#34d399', fontSize: 16 }}>{formatRunway(Math.round(runway * 10) / 10)}</span>
                    </div>
                )}
                <MF label="Key Wins / Milestones"><textarea className="sd-inp" rows={2} value={f.keyWins} onChange={U('keyWins')} placeholder="Product launches, partnerships…" /></MF>
                <MF label="Key Challenges"><textarea className="sd-inp" rows={2} value={f.keyChallenges} onChange={U('keyChallenges')} placeholder="Headwinds, churn, blockers…" /></MF>
                <MF label="Help Needed"><textarea className="sd-inp" rows={2} value={f.helpNeeded} onChange={U('helpNeeded')} placeholder="Intros, advice, follow-on…" /></MF>
                <MF label="General Notes"><textarea className="sd-inp" rows={2} value={f.notes} onChange={U('notes')} /></MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Submit Update"
                onSubmit={() => onSubmit({ ...f, revenue: +f.revenue, burnRate: +f.burnRate, cashBalance: +f.cashBalance, headcount: f.headcount ? +f.headcount : undefined })} />
        </Modal>
    );
}

function ExitModal({ onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ exitDate: '', exitValue: '', exitType: 'Acquisition' });
    const [confirmed, setConfirmed] = useState(false);
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    return (
        <Modal title="Record Exit" onClose={onClose} danger>
            <div className="sd-alert-banner red"><AlertTriangle size={14} />This permanently closes the investment. Cannot be undone.</div>
            <div className="sd-form-grid">
                <div className="sd-r2">
                    <MF label="Exit Date" req><input type="date" className="sd-inp" value={f.exitDate} onChange={U('exitDate')} required /></MF>
                    <MF label="Exit Type" req>
                        <select className="sd-inp" value={f.exitType} onChange={U('exitType')}>
                            {['Acquisition', 'IPO', 'Secondary Sale', 'Buyback'].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </MF>
                </div>
                <MF label="Exit Value (₹)" req><input type="number" className="sd-inp" value={f.exitValue} onChange={U('exitValue')} required min="0" /></MF>
                <label className="sd-confirm-check">
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                    I confirm this exit is final and cannot be undone
                </label>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Record Exit" danger
                onSubmit={() => { if (confirmed) onSubmit({ ...f, exitValue: +f.exitValue }); }} />
        </Modal>
    );
}

function FollowOnModal({ onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ amount: '', date: '', roundName: '', equityAcquired: '', valuationAtTime: '' });
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    return (
        <Modal title="Add Follow-On Investment" onClose={onClose}>
            <div className="sd-form-grid">
                <div className="sd-r2">
                    <MF label="Amount (₹)" req><input type="number" className="sd-inp" value={f.amount} onChange={U('amount')} required min="0" /></MF>
                    <MF label="Date" req><input type="date" className="sd-inp" value={f.date} onChange={U('date')} required /></MF>
                </div>
                <MF label="Round Name" req><input className="sd-inp" value={f.roundName} onChange={U('roundName')} required placeholder="e.g. Series A Follow-on" /></MF>
                <div className="sd-r2">
                    <MF label="Equity %" req><input type="number" className="sd-inp" value={f.equityAcquired} onChange={U('equityAcquired')} required min="0" max="100" step="0.01" /></MF>
                    <MF label="Valuation (₹)" req><input type="number" className="sd-inp" value={f.valuationAtTime} onChange={U('valuationAtTime')} required min="0" /></MF>
                </div>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Add Follow-On"
                onSubmit={() => onSubmit({ ...f, amount: +f.amount, equityAcquired: +f.equityAcquired, valuationAtTime: +f.valuationAtTime })} />
        </Modal>
    );
}

function EditStartupModal({ startup, onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ name: startup.name || '', sector: startup.sector || '', stage: startup.stage || '', description: startup.description || '', website: startup.website || '', founderName: startup.founderName || '', founderEmail: startup.founderEmail || '', coInvestors: startup.coInvestors || '' });
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    const handleSave = () => {
        const changes: any = {};
        for (const [k, v] of Object.entries(f)) { if (v !== (startup[k] || '')) changes[k] = v; }
        if (Object.keys(changes).length === 0) { onClose(); return; }
        onSubmit(changes);
    };
    return (
        <Modal title="Edit Startup" onClose={onClose}>
            <div className="sd-form-grid">
                <MF label="Company Name" req><input className="sd-inp" value={f.name} onChange={U('name')} required /></MF>
                <div className="sd-r2">
                    <MF label="Sector" req><select className="sd-inp" value={f.sector} onChange={U('sector')}>{SECTORS.map(s => <option key={s}>{s}</option>)}</select></MF>
                    <MF label="Stage" req><select className="sd-inp" value={f.stage} onChange={U('stage')}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></MF>
                </div>
                <MF label="Description"><textarea className="sd-inp" rows={2} value={f.description} onChange={U('description')} placeholder="Brief description…" /></MF>
                <MF label="Website"><input type="url" className="sd-inp" value={f.website} onChange={U('website')} placeholder="https://…" /></MF>
                <div className="sd-r2">
                    <MF label="Founder Name"><input className="sd-inp" value={f.founderName} onChange={U('founderName')} /></MF>
                    <MF label="Founder Email"><input type="email" className="sd-inp" value={f.founderEmail} onChange={U('founderEmail')} /></MF>
                </div>
                <MF label="Co-Investors"><input className="sd-inp" value={f.coInvestors} onChange={U('coInvestors')} placeholder="Comma-separated names" /></MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Save Changes" onSubmit={handleSave} />
        </Modal>
    );
}

function WriteOffConfirmDialog({ startupName, onClose, onConfirm, isLoading }: any) {
    const [text, setText] = useState('');
    const ok = text === 'WRITE OFF';
    return (
        <Modal title="Write Off Startup" onClose={onClose} danger>
            <div className="sd-alert-banner red" style={{ marginBottom: 16 }}><AlertTriangle size={14} />You are about to write off <strong>{startupName}</strong>. This marks it as a total loss.</div>
            <div className="sd-form-grid">
                <MF label={<>Type <strong style={{ color: '#f87171', fontFamily: 'var(--mono)' }}>WRITE OFF</strong> to confirm</>}>
                    <input className="sd-inp" value={text} onChange={e => setText(e.target.value)} placeholder="WRITE OFF" autoFocus />
                </MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Write Off Startup" danger onSubmit={() => { if (ok) onConfirm(); }} />
        </Modal>
    );
}

const CF_TYPES = [
    { value: 'investment', label: 'Investment (outflow)' },
    { value: 'follow_on', label: 'Follow-On (outflow)' },
    { value: 'exit', label: 'Exit (inflow)' },
    { value: 'correction', label: 'Correction (manual)' },
];

function AddCashflowModal({ onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ amount: '', date: '', type: 'correction', roundName: '', notes: '', reason: '' });
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    return (
        <Modal title="Add Ledger Entry" onClose={onClose}>
            <div className="sd-form-grid">
                <div className="sd-r2">
                    <MF label="Type" req><select className="sd-inp" value={f.type} onChange={U('type')}>{CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></MF>
                    <MF label="Amount (₹)" req><input type="number" className="sd-inp" value={f.amount} onChange={U('amount')} required min="0" /></MF>
                </div>
                <div className="sd-r2">
                    <MF label="Date" req><input type="date" className="sd-inp" value={f.date} onChange={U('date')} required /></MF>
                    <MF label="Round Name"><input className="sd-inp" value={f.roundName} onChange={U('roundName')} placeholder="e.g. Series A" /></MF>
                </div>
                <MF label="Notes"><textarea className="sd-inp" rows={2} value={f.notes} onChange={U('notes')} /></MF>
                <MF label="Reason (audit trail)"><input className="sd-inp" value={f.reason} onChange={U('reason')} placeholder="Why this entry?" /></MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Add Entry" onSubmit={() => onSubmit({ ...f, amount: +f.amount })} />
        </Modal>
    );
}

function EditCashflowModal({ cashflow, onClose, onSubmit, isLoading }: any) {
    const [f, setF] = useState({ amount: String(paiseToRupees(Math.abs(cashflow.amount))), date: cashflow.date ? new Date(cashflow.date).toISOString().split('T')[0] : '', type: cashflow.type || 'correction', roundName: cashflow.roundName || '', notes: cashflow.notes || '', reason: '' });
    const U = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
    return (
        <Modal title="Edit Cashflow" onClose={onClose}>
            <div className="sd-form-grid">
                <div className="sd-r2">
                    <MF label="Type"><select className="sd-inp" value={f.type} onChange={U('type')}>{CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></MF>
                    <MF label="Amount (₹)"><input type="number" className="sd-inp" value={f.amount} onChange={U('amount')} min="0" /></MF>
                </div>
                <div className="sd-r2">
                    <MF label="Date"><input type="date" className="sd-inp" value={f.date} onChange={U('date')} /></MF>
                    <MF label="Round Name"><input className="sd-inp" value={f.roundName} onChange={U('roundName')} /></MF>
                </div>
                <MF label="Notes"><textarea className="sd-inp" rows={2} value={f.notes} onChange={U('notes')} /></MF>
                <MF label={<span style={{ color: '#f87171' }}>Reason for Change *</span>}><input className="sd-inp" value={f.reason} onChange={U('reason')} required placeholder="Required — audit trail" /></MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Save Changes" onSubmit={() => onSubmit({ ...f, amount: +f.amount })} />
        </Modal>
    );
}

function DeleteCashflowConfirm({ cashflow, onClose, onConfirm, isLoading }: any) {
    const [reason, setReason] = useState('');
    return (
        <Modal title="Delete Cashflow Entry" onClose={onClose} danger>
            <div className="sd-alert-banner red" style={{ marginBottom: 16 }}><AlertTriangle size={14} />Deleting this <strong>{cashflow.type?.replace('_', ' ')}</strong> of <strong>{formatCurrencyCompact(paiseToRupees(Math.abs(cashflow.amount)))}</strong> will recompute all metrics.</div>
            <div className="sd-form-grid">
                <MF label="Reason for deletion *"><input className="sd-inp" value={reason} onChange={e => setReason(e.target.value)} placeholder="Required — audit trail" autoFocus /></MF>
            </div>
            <ModalFooter onClose={onClose} loading={isLoading} label="Delete Entry" danger onSubmit={() => { if (reason.trim()) onConfirm(reason); }} />
        </Modal>
    );
}

/* ═══════════════ STYLES ═══════════════ */
function SD() {
    return (
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');

:root{
    --gold:#C5A454; --gold2:rgba(197,164,84,.18); --gold3:rgba(197,164,84,.08); --gold4:rgba(197,164,84,.28);
    --bg:var(--color-bg,#07111d); --card:var(--color-card-bg,#0b1825);
    --bd:var(--color-border-light,rgba(255,255,255,.07)); --bd2:rgba(255,255,255,.04);
    --t1:var(--color-text-primary,#ede8db); --t2:var(--color-text-secondary,#7d8fa6); --t3:var(--color-text-muted,#3d4f63);
    --gr:#34d399; --rd:#f87171; --r:14px; --mono:'DM Mono',monospace;
}

/* ── root ── */
.sd{ padding:0 0 72px; font-family:'Syne',sans-serif; opacity:0; transform:translateY(10px); transition:opacity .45s ease,transform .45s ease; }
.sd--in{ opacity:1; transform:translateY(0); }

/* ── breadcrumb ── */
.sd-breadcrumb{ display:flex; align-items:center; gap:6px; margin-bottom:24px; font-size:11.5px; animation:sdUp .5s cubic-bezier(.16,1,.3,1) .05s both; }
.sd-bc-link{ color:var(--t3); text-decoration:none; transition:color .15s; }
.sd-bc-link:hover{ color:var(--gold); }
.sd-bc-sep{ color:var(--t3); opacity:.5; }
.sd-bc-muted{ color:var(--t3); }
.sd-bc-active{ color:var(--t1); font-weight:600; }

/* ── header ── */
.sd-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:32px; flex-wrap:wrap; animation:sdUp .55s cubic-bezier(.16,1,.3,1) .1s both; }
.sd-header-identity{ display:flex; align-items:flex-start; gap:16px; flex:1; }
.sd-avatar-wrap{ position:relative; flex-shrink:0; }
.sd-avatar{ width:60px; height:60px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:26px; font-weight:600; }
.sd-av-status{ position:absolute; bottom:-2px; right:-2px; width:12px; height:12px; border-radius:50%; border:2px solid var(--bg); }
.sd-av-status.active{ background:#34d399; box-shadow:0 0 6px rgba(52,211,153,.5); }
.sd-av-status.exited{ background:#94a3b8; }
.sd-av-status.writeoff{ background:#f87171; }
.sd-header-info{ flex:1; min-width:0; }
.sd-header-name-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
.sd-company-name{ font-family:'Cormorant Garamond',serif; font-size:clamp(22px,3vw,32px); font-weight:600; color:var(--t1); line-height:1.1; letter-spacing:-.3px; margin:0; }
.sd-stage-badge{ font-size:9px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; padding:3px 9px; border-radius:20px; }
.sd-chip{ display:inline-flex; align-items:center; gap:5px; border-radius:20px; font-size:10.5px; font-weight:700; padding:4px 10px; white-space:nowrap; }
.sd-chip-dot{ width:5px; height:5px; border-radius:50%; }
@keyframes pulseGr2{ 0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)} 70%{box-shadow:0 0 0 5px rgba(52,211,153,0)} 100%{box-shadow:0 0 0 0 rgba(52,211,153,0)} }
.sd-chip-dot.pulse{ animation:pulseGr2 2.2s infinite; }
.sd-description{ font-size:13px; color:var(--t2); line-height:1.5; margin:0 0 8px; }
.sd-meta-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.sd-meta-item{ display:flex; align-items:center; gap:5px; font-size:11px; color:var(--t3); }
.sd-meta-dot{ width:5px; height:5px; border-radius:50%; }
.sd-meta-div{ width:1px; height:10px; background:var(--bd); }

.sd-header-actions{ display:flex; gap:8px; align-items:center; flex-shrink:0; }

/* buttons */
.sd-gold-btn{ display:inline-flex; align-items:center; gap:6px; background:var(--gold); color:#080f18; font-family:'Syne',sans-serif; font-size:11.5px; font-weight:700; letter-spacing:.3px; padding:9px 18px; border-radius:8px; border:none; cursor:pointer; transition:opacity .15s,transform .15s,box-shadow .15s; box-shadow:0 4px 20px rgba(197,164,84,.2); white-space:nowrap; }
.sd-gold-btn:hover{ opacity:.9; transform:translateY(-1px); box-shadow:0 8px 28px rgba(197,164,84,.3); }
.sd-gold-btn:active{ transform:translateY(0); }
.sd-gold-btn.sm{ padding:7px 13px; font-size:11px; }
.sd-ghost-btn{ display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.04); border:1px solid var(--bd); color:var(--t2); font-family:'Syne',sans-serif; font-size:11.5px; font-weight:600; padding:9px 16px; border-radius:8px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.sd-ghost-btn:hover{ border-color:var(--gold4); color:var(--t1); }

/* manage menu */
.sd-manage-wrap{ position:relative; }
.sd-manage-menu{ position:absolute; top:calc(100% + 6px); right:0; min-width:195px; background:var(--card); border:1px solid var(--bd); border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.04); z-index:80; overflow:hidden; animation:dropDown .18s cubic-bezier(.16,1,.3,1); }
@keyframes dropDown{ from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
.sd-mm-item{ display:flex; align-items:center; gap:9px; width:100%; padding:10px 14px; font-size:12px; font-weight:500; color:var(--t2); background:none; border:none; cursor:pointer; text-align:left; font-family:'Syne',sans-serif; transition:background .1s; white-space:nowrap; }
.sd-mm-item:hover{ background:rgba(255,255,255,.04); color:var(--t1); }
.sd-mm-item.danger{ color:#f87171; }
.sd-mm-item.danger:hover{ background:rgba(248,113,113,.08); }
.sd-mm-div{ height:1px; background:var(--bd); margin:4px 0; }

/* ── stat cards ── */
.sd-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
@media(max-width:900px){.sd-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.sd-stats{grid-template-columns:1fr;}}
.sd-stat{ position:relative; overflow:hidden; background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:22px 20px 18px; animation:sdUp .5s cubic-bezier(.16,1,.3,1) both; animation-delay:calc(var(--idx)*80ms + 200ms); transition:border-color .2s,transform .2s,box-shadow .2s; }
.sd-stat:hover{ border-color:var(--gold4); transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,.3); }
.sd-stat-shine{ position:absolute; inset:0; background:radial-gradient(ellipse 70% 60% at 90% 0%,color-mix(in srgb,var(--ac) 8%,transparent) 0%,transparent 70%); pointer-events:none; }
.sd-stat-arc{ position:absolute; top:-10px; right:-10px; width:70px; height:70px; pointer-events:none; }
.sd-stat-lbl{ font-size:9.5px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--t3); margin-bottom:12px; }
.sd-stat-val{ font-family:'Cormorant Garamond',serif; font-size:clamp(22px,2.5vw,28px); font-weight:600; color:var(--t1); line-height:1; margin-bottom:8px; letter-spacing:-.3px; }
.sd-stat-sub{ font-size:11px; color:var(--t3); }
.sd-stat-bar{ position:absolute; bottom:0; left:0; right:0; height:2px; background:rgba(255,255,255,.04); }
.sd-stat-bar-fill{ height:100%; width:100%; background:linear-gradient(90deg,var(--ac,#C5A454),transparent); opacity:.65; }

/* ── tabs ── */
.sd-tabs{ display:flex; align-items:center; gap:2px; border-bottom:1px solid var(--bd); margin-bottom:24px; overflow-x:auto; animation:sdUp .5s cubic-bezier(.16,1,.3,1) .38s both; -ms-overflow-style:none; scrollbar-width:none; }
.sd-tabs::-webkit-scrollbar{ display:none; }
.sd-tab{ display:flex; align-items:center; gap:6px; position:relative; padding:10px 14px 12px; font-size:11.5px; font-weight:600; color:var(--t3); background:none; border:none; cursor:pointer; transition:color .15s; white-space:nowrap; font-family:'Syne',sans-serif; }
.sd-tab:hover{ color:var(--t2); }
.sd-tab.on{ color:var(--t1); }
.sd-tab-indicator{ position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--gold); border-radius:2px 2px 0 0; animation:slideIn .2s ease; }
@keyframes slideIn{ from{transform:scaleX(0)} to{transform:scaleX(1)} }

/* ── tab body ── */
.sd-tab-body{ animation:sdUp .4s cubic-bezier(.16,1,.3,1) .05s both; }

/* ── cards ── */
.sd-card{ background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:22px; }
.sd-card-flush{ padding:0; }
.sd-card-hd{ display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
.sd-card-hd-flush{ display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--bd); }
.sd-card-title{ font-size:13px; font-weight:700; color:var(--t1); letter-spacing:.1px; margin:0; }
.sd-select-sm{ background:rgba(255,255,255,.04); border:1px solid var(--bd); border-radius:6px; padding:5px 10px; font-size:11.5px; color:var(--t2); outline:none; cursor:pointer; font-family:'Syne',sans-serif; }
.sd-link-btn{ display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:var(--gold); background:none; border:none; cursor:pointer; font-family:'Syne',sans-serif; }

/* chart */
.sd-chart-wrap{ height:240px; }

/* ── table ── */
.sd-table{ width:100%; border-collapse:collapse; }
.sd-table thead tr{ border-bottom:1px solid var(--bd); }
.sd-table th{ padding:10px 18px; font-size:9.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--t3); text-align:left; white-space:nowrap; }
.sd-table th.nr{ text-align:right; }
.sd-table td{ padding:12px 18px; font-size:12.5px; color:var(--t1); border-bottom:1px solid rgba(255,255,255,.025); }
.sd-table td.nr{ text-align:right; }
.sd-table td.mono{ font-family:'DM Mono',monospace; font-size:12px; }
.sd-table td.muted{ color:var(--t2); }
.sd-table td.xs{ font-size:11px; max-width:160px; }
.sd-table td.semi{ font-weight:600; }
.sd-table td.green{ color:#34d399; }
.sd-table td.red{ color:#f87171; }
.sd-table tbody tr{ transition:background .15s; cursor:default; }
.sd-table tbody tr:hover td{ background:rgba(197,164,84,.03); }
.sd-table tbody tr:last-child td{ border-bottom:none; }
.sd-table-empty{ text-align:center; padding:40px; color:var(--t3); font-size:13px; }
.sd-type-badge{ display:inline-block; font-size:10px; font-weight:700; text-transform:capitalize; padding:2px 8px; border-radius:20px; }
.sd-row-acts{ display:flex; gap:4px; }
.sd-act-btn{ background:none; border:none; cursor:pointer; color:var(--t3); padding:4px; border-radius:6px; display:flex; transition:all .15s; }
.sd-act-btn:hover{ background:rgba(255,255,255,.06); color:var(--t1); }
.sd-act-btn.red:hover{ background:rgba(248,113,113,.1); color:#f87171; }

/* ── overview grid ── */
.sd-overview-grid{ display:grid; grid-template-columns:1fr 360px; gap:16px; }
@media(max-width:1024px){.sd-overview-grid{grid-template-columns:1fr;}}
.sd-ov-left{ display:flex; flex-direction:column; gap:16px; }
.sd-ov-right{ display:flex; flex-direction:column; gap:16px; }

/* timeline */
.sd-timeline{ display:flex; flex-direction:column; gap:0; }
.sd-tl-item{ display:flex; gap:12px; position:relative; padding-bottom:20px; }
.sd-tl-item:last-child{ padding-bottom:0; }
.sd-tl-item.has-line::before{ content:''; position:absolute; left:5px; top:14px; width:1px; height:calc(100% - 4px); background:var(--bd); }
.sd-tl-dot{ width:11px; height:11px; border-radius:50%; flex-shrink:0; margin-top:3px; z-index:1; transition:all .2s; }
.sd-tl-item:hover .sd-tl-dot{ transform:scale(1.2); }
.sd-tl-content{ flex:1; }
.sd-tl-month{ font-size:9.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
.sd-tl-rev{ font-size:13px; font-weight:600; color:var(--t1); margin-bottom:3px; }
.sd-tl-meta{ font-size:11px; color:var(--t3); }
.sd-tl-notes{ font-size:11px; color:var(--t2); margin-top:4px; line-height:1.4; }

/* docs */
.sd-docs-list{ display:flex; flex-direction:column; gap:10px; }
.sd-doc-row{ display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--bd2); border-radius:9px; transition:border-color .15s; }
.sd-doc-row:hover{ border-color:var(--gold4); }
.sd-doc-icon{ width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; letter-spacing:.5px; flex-shrink:0; }
.sd-doc-icon.lg{ width:40px; height:40px; font-size:10px; }
.sd-doc-info{ flex:1; min-width:0; }
.sd-doc-name{ font-size:12px; font-weight:600; color:var(--t1); margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sd-doc-meta{ font-size:10.5px; color:var(--t3); margin:0; }
.sd-dl-btn{ background:none; border:none; cursor:pointer; color:var(--t3); padding:6px; border-radius:7px; display:flex; transition:all .15s; }
.sd-dl-btn:hover{ color:var(--gold); background:var(--gold3); }

.sd-docs-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.sd-doc-card{ display:flex; align-items:center; gap:12px; background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:16px; transition:border-color .2s,transform .2s; }
.sd-doc-card:hover{ border-color:var(--gold4); transform:translateY(-1px); }

/* founder */
.sd-founder-row{ display:flex; align-items:center; gap:12px; }
.sd-founder-av{ width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; flex-shrink:0; }
.sd-founder-name{ font-size:13px; font-weight:600; color:var(--t1); margin:0 0 2px; }
.sd-founder-role{ font-size:11px; color:var(--t3); margin:0; }

/* empty */
.sd-empty-text{ font-size:12.5px; color:var(--t3); text-align:center; padding:20px 0; }
.sd-empty-state{ text-align:center; padding:60px 20px; color:var(--t3); font-size:13px; background:var(--card); border:1px solid var(--bd); border-radius:var(--r); }

/* notes */
.sd-notes-grid{ display:grid; grid-template-columns:1fr 280px; gap:16px; }
@media(max-width:900px){.sd-notes-grid{grid-template-columns:1fr;}}
.sd-notes-main{ display:flex; flex-direction:column; gap:12px; }
.sd-note-compose{ display:flex; gap:10px; align-items:flex-end; }
.sd-textarea{ flex:1; background:rgba(255,255,255,.04); border:1px solid var(--bd); border-radius:8px; padding:10px 12px; font-size:13px; color:var(--t1); font-family:'Syne',sans-serif; resize:vertical; outline:none; transition:border-color .15s,box-shadow .15s; }
.sd-textarea:focus{ border-color:var(--gold4); box-shadow:0 0 0 3px rgba(197,164,84,.06); }
.sd-notes-list{ display:flex; flex-direction:column; gap:10px; }
.sd-note-card{ background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:16px 18px; }
.sd-note-text{ font-size:13px; color:var(--t1); line-height:1.6; margin:0 0 8px; }
.sd-note-date{ font-size:10.5px; color:var(--t3); margin:0; }
.sd-co-tags{ display:flex; flex-wrap:wrap; gap:7px; }
.sd-co-tag{ font-size:11.5px; font-weight:600; padding:4px 12px; border-radius:20px; background:rgba(96,165,250,.1); color:#60a5fa; border:1px solid rgba(96,165,250,.2); }

/* updates/dilution wrapper */
.sd-updates-wrap{ display:flex; flex-direction:column; gap:14px; }
.sd-tab-action-bar{ display:flex; justify-content:flex-end; }

/* ── modal ── */
.sd-ov{ position:fixed; inset:0; background:rgba(0,0,0,.8); display:flex; align-items:center; justify-content:center; z-index:300; backdrop-filter:blur(10px); padding:16px; animation:fadeIn .18s ease; }
@keyframes fadeIn{ from{opacity:0} to{opacity:1} }
.sd-modal{ background:var(--card); border:1px solid rgba(255,255,255,.1); border-radius:20px; width:100%; max-width:510px; max-height:90vh; overflow-y:auto; box-shadow:0 40px 100px rgba(0,0,0,.8),0 0 0 1px rgba(197,164,84,.06); animation:modalPop .22s cubic-bezier(.16,1,.3,1); }
@keyframes modalPop{ from{opacity:0;transform:scale(.95) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
.sd-modal-hd{ display:flex; align-items:center; justify-content:space-between; padding:22px 24px 0; }
.sd-modal-title{ font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:600; color:var(--t1); }
.sd-modal-x{ background:rgba(255,255,255,.06); border:1px solid var(--bd); border-radius:8px; cursor:pointer; color:var(--t2); width:30px; height:30px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.sd-modal-x:hover{ background:rgba(255,255,255,.1); color:var(--t1); }
.sd-modal-body{ padding:18px 24px 24px; display:flex; flex-direction:column; gap:12px; }
.sd-modal-ft{ display:flex; gap:10px; padding-top:4px; }
.sd-modal-ft .sd-ghost-btn,.sd-modal-ft .sd-gold-btn{ flex:1; justify-content:center; }
.sd-form-grid{ display:flex; flex-direction:column; gap:12px; }
.sd-mf{ display:flex; flex-direction:column; gap:6px; }
.sd-ml{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--t3); }
.sd-mreq{ color:var(--gold); margin-left:2px; }
.sd-r2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.sd-inp{ background:rgba(255,255,255,.04); border:1px solid var(--bd); border-radius:8px; padding:9px 12px; font-size:13px; font-family:'Syne',sans-serif; color:var(--t1); outline:none; width:100%; box-sizing:border-box; transition:border-color .15s,box-shadow .15s; -webkit-appearance:none; }
.sd-inp:focus{ border-color:var(--gold4); background:rgba(197,164,84,.04); box-shadow:0 0 0 3px rgba(197,164,84,.06); }
.sd-alert-banner{ display:flex; align-items:flex-start; gap:8px; padding:11px 14px; border-radius:9px; font-size:12.5px; line-height:1.5; }
.sd-alert-banner.red{ background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.25); color:#f87171; }
.sd-runway-hint{ display:flex; justify-content:space-between; align-items:center; background:var(--gold3); border:1px solid var(--gold4); border-radius:8px; padding:10px 14px; }
.sd-runway-hint span:first-child{ font-size:11.5px; color:var(--t2); }
.sd-confirm-check{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--t2); cursor:pointer; }

/* ── skeleton ── */
.sd-skel-root{ display:flex; flex-direction:column; gap:20px; padding:0 0 72px; }
.sd-skel-hd{ display:flex; align-items:center; gap:16px; }
.sd-skel-av{ width:60px; height:60px; border-radius:16px; background:var(--card); animation:shimmer 1.5s infinite; }
.sd-skel-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.sd-skel-card{ height:90px; border-radius:var(--r); background:var(--card); animation:shimmer 1.5s infinite; }
.sd-skel-line{ border-radius:6px; background:var(--card); animation:shimmer 1.5s infinite; }
.w-48{ width:192px; } .w-32{ width:128px; } .h-8{ height:32px; } .h-4{ height:16px; } .w-full{ width:100%; } .h-10{ height:40px; } .mt-2{ margin-top:8px; }
@keyframes shimmer{ 0%{opacity:.4} 50%{opacity:.8} 100%{opacity:.4} }
.sd-not-found{ text-align:center; padding:80px 20px; color:var(--t3); font-size:13px; font-family:'Syne',sans-serif; }

/* ── utils ── */
.mono{ font-family:'DM Mono',monospace !important; } .semi{ font-weight:600; }
@keyframes sdUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
    );
}
