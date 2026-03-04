/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Plus, X, Download,
    ChevronLeft, ChevronRight, Search,
    LayoutGrid, List, ArrowUpDown,
    ExternalLink, CheckCircle2, TrendingUp, TrendingDown,
    Building2, SlidersHorizontal
} from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatPercent, paiseToRupees } from '../utils/formatters';
import { invalidateInvestmentQueries } from '../utils/invalidation';
import toast from 'react-hot-toast';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'];
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'];

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    'Pre-Seed': { bg: 'rgba(167,139,250,.08)', color: '#a78bfa', border: 'rgba(167,139,250,.2)' },
    'Seed': { bg: 'rgba(251,191,36,.08)', color: '#fbbf24', border: 'rgba(251,191,36,.2)' },
    'Series A': { bg: 'rgba(52,211,153,.08)', color: '#34d399', border: 'rgba(52,211,153,.2)' },
    'Series B': { bg: 'rgba(96,165,250,.08)', color: '#60a5fa', border: 'rgba(96,165,250,.2)' },
    'Series C': { bg: 'rgba(249,115,22,.08)', color: '#f97316', border: 'rgba(249,115,22,.2)' },
    'Growth': { bg: 'rgba(197,164,84,.08)', color: '#C5A454', border: 'rgba(197,164,84,.2)' },
    'Pre-IPO': { bg: 'rgba(236,72,153,.08)', color: '#ec4899', border: 'rgba(236,72,153,.2)' },
};

type SortKey = 'name' | 'invested' | 'currentValue' | 'xirr' | 'moic';
type ViewMode = 'table' | 'grid';


export default function PortfolioPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('');
    const [sectorFilter, setSector] = useState('');
    const [stageFilter, setStage] = useState('');
    const [showAddModal, setShowAdd] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [sortKey, setSortKey] = useState<SortKey>('invested');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [openDrop, setOpenDrop] = useState<string | null>(null);
    const PAGE_SIZE = 8;

    const { data: startups, isLoading } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => { const r = await startupsAPI.getAll(); return r.data.data; },
    });

    const createMutation = useMutation({
        mutationFn: (d: any) => startupsAPI.create(d),
        onSuccess: () => { invalidateInvestmentQueries(queryClient); setShowAdd(false); toast.success('Investment added'); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to add'),
    });

    const filtered = useMemo(() => {
        if (!startups) return [];
        let l = [...startups];
        if (search) l = l.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()) || s.sector.toLowerCase().includes(search.toLowerCase()));
        if (statusFilter) l = l.filter((s: any) => s.status === statusFilter);
        if (sectorFilter) l = l.filter((s: any) => s.sector === sectorFilter);
        if (stageFilter) l = l.filter((s: any) => s.stage === stageFilter);
        l.sort((a: any, b: any) => {
            if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            const map: Record<string, string> = { invested: 'metrics.invested', currentValue: 'metrics.currentValue', xirr: 'metrics.xirr', moic: 'metrics.moic' };
            const get = (o: any, p: string) => p.split('.').reduce((x, k) => x?.[k], o) || 0;
            const av = get(a, map[sortKey]), bv = get(b, map[sortKey]);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        return l;
    }, [startups, search, statusFilter, sectorFilter, stageFilter, sortKey, sortDir]);

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const totalInvested = (startups || []).reduce((s: number, x: any) => s + x.metrics.invested, 0);
    const currentValue = (startups || []).reduce((s: number, x: any) => s + x.metrics.currentValue, 0);
    const activeCount = (startups || []).filter((x: any) => x.status === 'active').length;
    const portfolioGain = totalInvested > 0 ? (currentValue - totalInvested) / totalInvested : 0;
    const hasFilters = search || statusFilter || sectorFilter || stageFilter;

    const clearFilters = () => { setSearch(''); setStatus(''); setSector(''); setStage(''); setPage(1); };
    const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('desc'); } };

    const handleExport = () => {
        if (!startups) return;
        const h = ['Company', 'Sector', 'Stage', 'Status', 'Invested', 'Value', 'MOIC', 'IRR'];
        const rows = startups.map((s: any) => [
            `"${s.name}"`, `"${s.sector}"`, `"${s.stage}"`, `"${s.status}"`,
            `"${paiseToRupees(s.metrics.invested)}"`, `"${paiseToRupees(s.metrics.currentValue)}"`,
            `"${s.metrics.moic}x"`, `"${formatPercent(s.metrics.xirr)}"`
        ].join(','));
        const blob = new Blob([[h.join(','), ...rows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `portfolio_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    if (!isLoading && (!startups || startups.length === 0)) return (
        <>
            <PortfolioStyles />
            <EmptyState onAdd={() => setShowAdd(true)}>
                {showAddModal && <AddInvestmentModal onClose={() => setShowAdd(false)} onSubmit={(d: any) => createMutation.mutate(d)} isLoading={createMutation.isPending} />}
            </EmptyState>
        </>
    );

    return (
        <>
            <PortfolioStyles />
            <div className="pf-root" onClick={() => setOpenDrop(null)}>

                {/* ── Header ── */}
                <header className="pf-header">
                    <div className="pf-header-left">
                        <div className="pf-eyebrow">Investment Portfolio</div>
                        <h1 className="pf-title">Holdings Overview</h1>
                    </div>
                    <div className="pf-header-right">
                        <button className="pf-btn-ghost" onClick={handleExport}>
                            <Download size={14} /> Export
                        </button>
                        <button className="pf-btn-gold" onClick={() => setShowAdd(true)}>
                            <Plus size={14} /> New Investment
                        </button>
                    </div>
                </header>

                {/* ── Stat Strip ── */}
                <div className="pf-stats">
                    <StatCard label="Total Deployed" value={formatCurrencyCompact(paiseToRupees(totalInvested))} sub={`${(startups || []).length} companies`} accent="#C5A454" index={0} />
                    <StatCard
                        label="Portfolio Value"
                        value={formatCurrencyCompact(paiseToRupees(currentValue))}
                        sub={`${portfolioGain >= 0 ? '+' : ''}${(portfolioGain * 100).toFixed(1)}% unrealised`}
                        accent={portfolioGain >= 0 ? '#34d399' : '#f87171'}
                        trend={portfolioGain >= 0 ? 'up' : 'down'}
                        index={1}
                    />
                    <StatCard label="Active Holdings" value={String(activeCount)} sub={`${(startups || []).length - activeCount} exited`} accent="#60a5fa" index={2} />
                    <StatCard label="Filtered" value={String(filtered.length)} sub={hasFilters ? 'with filters' : 'all companies'} accent="#a78bfa" index={3} />
                </div>

                {/* ── Toolbar ── */}
                <div className="pf-toolbar">
                    <div className="pf-search-wrap">
                        <Search size={13} className="pf-search-icon" />
                        <input className="pf-search" placeholder="Search companies, sectors…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        {search && <button className="pf-search-clear" onClick={() => { setSearch(''); setPage(1); }}><X size={11} /></button>}
                    </div>

                    <div className="pf-filter-group" onClick={e => e.stopPropagation()}>
                        <DropFilter label="Status" value={statusFilter} options={['', 'active', 'exited', 'written_off']}
                            labels={{ '': "All", 'active': 'Active', 'exited': 'Exited', 'written_off': 'Written Off' }}
                            open={openDrop === 'status'} onToggle={() => setOpenDrop(openDrop === 'status' ? null : 'status')}
                            onChange={(v: string) => { setStatus(v); setPage(1); setOpenDrop(null); }} />
                        <DropFilter label="Sector" value={sectorFilter} options={['', ...SECTORS]}
                            open={openDrop === 'sector'} onToggle={() => setOpenDrop(openDrop === 'sector' ? null : 'sector')}
                            onChange={(v: string) => { setSector(v); setPage(1); setOpenDrop(null); }} />
                        <DropFilter label="Stage" value={stageFilter} options={['', ...STAGES]}
                            open={openDrop === 'stage'} onToggle={() => setOpenDrop(openDrop === 'stage' ? null : 'stage')}
                            onChange={(v: string) => { setStage(v); setPage(1); setOpenDrop(null); }} />
                        {hasFilters && <button className="pf-clear-btn" onClick={clearFilters}><X size={10} /> Clear</button>}
                    </div>

                    <div className="pf-toolbar-right">
                        <div className="pf-view-switch">
                            <button className={`pf-view-btn${viewMode === 'table' ? ' on' : ''}`} onClick={() => setViewMode('table')}><List size={13} /></button>
                            <button className={`pf-view-btn${viewMode === 'grid' ? ' on' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid size={13} /></button>
                        </div>
                    </div>
                </div>

                {/* ── Results meta ── */}
                <div className="pf-meta">
                    <span className="pf-meta-count">{filtered.length} {filtered.length === 1 ? 'company' : 'companies'}{hasFilters ? ' · filtered' : ''}</span>
                    <div className="pf-sort-pills">
                        {(['invested', 'currentValue', 'moic', 'xirr', 'name'] as SortKey[]).map(k => (
                            <button key={k} className={`pf-sort-pill${sortKey === k ? ' active' : ''}`} onClick={() => toggleSort(k)}>
                                {k === 'invested' ? 'Cost' : k === 'currentValue' ? 'Value' : k === 'xirr' ? 'IRR' : k === 'moic' ? 'MOIC' : 'Name'}
                                {sortKey === k && <span className="pf-sort-dir">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="pf-skeletons">{[1, 2, 3, 4, 5].map(i => <div key={i} className="pf-skeleton" style={{ animationDelay: `${i * 80}ms` }} />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="pf-no-results">
                        <div className="pf-no-results-icon"><SlidersHorizontal size={22} /></div>
                        <p>No companies match your filters</p>
                        <button className="pf-clear-btn" onClick={clearFilters}>Clear filters</button>
                    </div>
                ) : viewMode === 'table' ? (
                    <TableView rows={paginated} sortKey={sortKey} onSort={toggleSort}
                        onRowClick={(id: string) => navigate(`/portfolio/${id}`)}
                        page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
                ) : (
                    <>
                        <div className="pf-grid">{paginated.map((s: any, i: number) => (
                            <CardItem key={s._id} startup={s} index={i} onClick={() => navigate(`/portfolio/${s._id}`)} />
                        ))}</div>
                        <PaginationBar page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
                    </>
                )}
            </div>

            {showAddModal && <AddInvestmentModal onClose={() => setShowAdd(false)} onSubmit={(d: any) => createMutation.mutate(d)} isLoading={createMutation.isPending} />}
        </>
    );
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, accent, trend, index }: { label: string; value: string; sub: string; accent: string; trend?: 'up' | 'down'; index: number }) {
    return (
        <div className="pf-stat" style={{ '--accent': accent, '--i': index } as any}>
            <div className="pf-stat-label">{label}</div>
            <div className="pf-stat-value">{value}</div>
            <div className="pf-stat-sub" style={{ color: trend ? accent : 'var(--t3)' }}>
                {trend === 'up' && <TrendingUp size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                {trend === 'down' && <TrendingDown size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                {sub}
            </div>
            <div className="pf-stat-accent-line" style={{ background: `linear-gradient(90deg,${accent},transparent)` }} />
        </div>
    );
}

/* ── Dropdown Filter ── */
function DropFilter({ label, value, options, labels = {}, open, onToggle, onChange }: any) {
    const display = labels[value] ?? value ?? 'All';
    const isActive = value !== '';
    return (
        <div className="pf-drop-wrap">
            <button className={`pf-drop-btn${isActive ? ' active' : ''}`} onClick={onToggle}>
                <span className="pf-drop-label">{label}</span>
                <span className="pf-drop-val">{isActive ? display : 'All'}</span>
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: .5, flexShrink: 0 }}>
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
            {open && (
                <div className="pf-drop-menu">
                    {options.map((o: string) => (
                        <button key={o} className={`pf-drop-item${value === o ? ' sel' : ''}`} onClick={() => onChange(o)}>
                            {value === o && <CheckCircle2 size={11} />}
                            <span>{(labels[o] ?? o) || 'All'}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Table View ── */
function TableView({ rows, sortKey, onSort, onRowClick, page, totalPages, totalCount, pageSize, onPage }: any) {
    return (
        <div className="pf-table-card">
            <div style={{ overflowX: 'auto' }}>
                <table className="pf-table">
                    <thead>
                        <tr>
                            <th className="sort" onClick={() => onSort('name')}>Company <SortIcon k="name" sk={sortKey} /></th>
                            <th>Sector</th>
                            <th className="sort num" onClick={() => onSort('invested')}>Cost <SortIcon k="invested" sk={sortKey} /></th>
                            <th className="sort num" onClick={() => onSort('currentValue')}>Value <SortIcon k="currentValue" sk={sortKey} /></th>
                            <th className="sort num" onClick={() => onSort('moic')}>MOIC <SortIcon k="moic" sk={sortKey} /></th>
                            <th className="sort num" onClick={() => onSort('xirr')}>IRR <SortIcon k="xirr" sk={sortKey} /></th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s: any, i: number) => {
                            const moic = s.metrics.moic || 0;
                            const up = s.metrics.currentValue >= s.metrics.invested;
                            const stage = STAGE_COLORS[s.stage] || { bg: 'rgba(255,255,255,.05)', color: 'var(--t3)', border: 'rgba(255,255,255,.08)' };
                            return (
                                <tr key={s._id} onClick={() => onRowClick(s._id)} style={{ animationDelay: `${i * 30}ms` }} className="pf-tr-in">
                                    <td>
                                        <div className="pf-co-cell">
                                            <div className="pf-avatar" style={{
                                                background: `hsl(${s.name.charCodeAt(0) * 13},40%,16%)`,
                                                color: `hsl(${s.name.charCodeAt(0) * 13},55%,65%)`,
                                                border: `1px solid hsl(${s.name.charCodeAt(0) * 13},40%,22%)`,
                                            }}>{s.name.charAt(0)}</div>
                                            <div>
                                                <div className="pf-co-name">{s.name}</div>
                                                <div className="pf-co-stage" style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }}>{s.stage}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="pf-sector">{s.sector}</span></td>
                                    <td className="num mono">{formatCurrencyCompact(paiseToRupees(s.metrics.invested))}</td>
                                    <td className="num">
                                        <span className="mono fw" style={{ color: up ? '#34d399' : '#f87171' }}>{formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}</span>
                                    </td>
                                    <td className="num">
                                        <div className="pf-moic-cell">
                                            <div className="pf-moic-track"><div className="pf-moic-fill" style={{ width: `${Math.min(100, (moic / 5) * 100)}%` }} /></div>
                                            <span className="mono fw" style={{ color: moic >= 1 ? '#C5A454' : '#f87171' }}>{moic.toFixed(2)}×</span>
                                        </div>
                                    </td>
                                    <td className="num mono fw" style={{ color: (s.metrics.xirr || 0) >= 0 ? '#34d399' : '#f87171' }}>{formatPercent(s.metrics.xirr)}</td>
                                    <td style={{ textAlign: 'center' }}><StatusPill status={s.status} /></td>
                                    <td><button className="pf-row-link" onClick={e => e.stopPropagation()}><ExternalLink size={13} /></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPage={onPage} />
        </div>
    );
}
const SortIcon = ({ k, sk }: { k: string; sk: string }) => <ArrowUpDown size={10} style={{ opacity: sk === k ? 1 : .3, color: sk === k ? '#C5A454' : 'currentColor', marginLeft: 3, verticalAlign: 'middle' }} />;

/* ── Card Item ── */
function CardItem({ startup: s, index: i, onClick }: any) {
    const stage = STAGE_COLORS[s.stage] || { bg: 'rgba(255,255,255,.05)', color: 'var(--t3)', border: 'rgba(255,255,255,.08)' };
    const up = s.metrics.currentValue >= s.metrics.invested;
    return (
        <div className="pf-card pf-tr-in" style={{ animationDelay: `${i * 50}ms` }} onClick={onClick}>
            <div className="pf-card-top">
                <div className="pf-co-cell">
                    <div className="pf-avatar lg" style={{
                        background: `hsl(${s.name.charCodeAt(0) * 13},40%,16%)`,
                        color: `hsl(${s.name.charCodeAt(0) * 13},55%,65%)`,
                        border: `1px solid hsl(${s.name.charCodeAt(0) * 13},40%,22%)`,
                    }}>{s.name.charAt(0)}</div>
                    <div>
                        <div className="pf-co-name">{s.name}</div>
                        <div className="pf-co-stage" style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }}>{s.stage}</div>
                    </div>
                </div>
                <StatusPill status={s.status} />
            </div>
            <div className="pf-card-divider" />
            <div className="pf-card-metrics">
                {[
                    { l: 'Cost', v: formatCurrencyCompact(paiseToRupees(s.metrics.invested)), c: 'var(--t2)' },
                    { l: 'Value', v: formatCurrencyCompact(paiseToRupees(s.metrics.currentValue)), c: up ? '#34d399' : '#f87171' },
                    { l: 'MOIC', v: `${(s.metrics.moic || 0).toFixed(2)}×`, c: (s.metrics.moic || 0) >= 1 ? '#C5A454' : '#f87171' },
                    { l: 'IRR', v: formatPercent(s.metrics.xirr), c: (s.metrics.xirr || 0) >= 0 ? '#34d399' : '#f87171' },
                ].map(m => (
                    <div key={m.l} className="pf-metric-box">
                        <div className="pf-metric-label">{m.l}</div>
                        <div className="pf-metric-val mono" style={{ color: m.c }}>{m.v}</div>
                    </div>
                ))}
            </div>
            <div className="pf-card-arrow"><ExternalLink size={13} /></div>
        </div>
    );
}

/* ── Status Pill ── */
function StatusPill({ status }: { status: string }) {
    const cfg: any = {
        active: { bg: 'rgba(52,211,153,.1)', color: '#34d399', dot: '#34d399', label: 'Active' },
        exited: { bg: 'rgba(148,163,184,.1)', color: '#94a3b8', dot: '#94a3b8', label: 'Exited' },
        written_off: { bg: 'rgba(248,113,113,.1)', color: '#f87171', dot: '#f87171', label: 'Written Off' },
    };
    const c = cfg[status] || cfg.exited;
    return (
        <span className="pf-status" style={{ background: c.bg, color: c.color }}>
            <span className={`pf-status-dot${status === 'active' ? ' pulse' : ''}`} style={{ background: c.dot }} />
            {c.label}
        </span>
    );
}

/* ── Pagination ── */
function PaginationBar({ page, totalPages, totalCount, pageSize, onPage }: any) {
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);
    const pages = useMemo(() => {
        const a: (number | '...')[] = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) a.push(i);
            else if (a[a.length - 1] !== '...') a.push('...');
        }
        return a;
    }, [page, totalPages]);

    return (
        <div className="pf-pag">
            <span className="pf-pag-info">{totalCount === 0 ? 'No results' : `${from}–${to} of ${totalCount}`}</span>
            <div className="pf-pag-btns">
                <button className="pf-pag-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={13} /></button>
                {pages.map((p, i) => p === '...'
                    ? <span key={`e${i}`} className="pf-pag-ellipsis">…</span>
                    : <button key={p} className={`pf-pag-btn${page === p ? ' on' : ''}`} onClick={() => onPage(p)}>{p}</button>
                )}
                <button className="pf-pag-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={13} /></button>
            </div>
        </div>
    );
}

/* ── Empty State ── */
function EmptyState({ onAdd, children }: any) {
    return (
        <div className="pf-empty-root">
            <div className="pf-empty-icon"><Building2 size={32} /></div>
            <h2 className="pf-empty-title">No investments yet</h2>
            <p className="pf-empty-sub">Begin tracking your portfolio by adding your first investment.</p>
            <button className="pf-btn-gold" onClick={onAdd}><Plus size={14} /> Add Investment</button>
            {children}
        </div>
    );
}

/* ── Add Modal ── */
function AddInvestmentModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (d: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({ name: '', sector: 'FinTech', stage: 'Seed', investmentDate: '', entryValuation: '', investedAmount: '', equityPercent: '', founderName: '', description: '' });
    const implied = form.investedAmount && form.entryValuation ? ((+form.investedAmount / +form.entryValuation) * 100).toFixed(2) : null;
    const F = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

    return (
        <div className="pf-overlay" onClick={onClose}>
            <div className="pf-modal" onClick={e => e.stopPropagation()}>
                <div className="pf-modal-head">
                    <span className="pf-modal-title">New Investment</span>
                    <button className="pf-modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="pf-modal-body">
                    <Field label="Startup Name" required>
                        <input className="pf-input" value={form.name} onChange={F('name')} required placeholder="e.g. Acme Technologies" />
                    </Field>
                    <div className="pf-row2">
                        <Field label="Sector" required>
                            <select className="pf-input pf-select" value={form.sector} onChange={F('sector')}>
                                {SECTORS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="Stage" required>
                            <select className="pf-input pf-select" value={form.stage} onChange={F('stage')}>
                                {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Investment Date" required>
                        <input type="date" className="pf-input" value={form.investmentDate} onChange={F('investmentDate')} required />
                    </Field>
                    <div className="pf-row2">
                        <Field label="Entry Valuation (₹)" required>
                            <input type="number" className="pf-input" value={form.entryValuation} onChange={F('entryValuation')} required min="0" placeholder="0" />
                        </Field>
                        <Field label="Amount Invested (₹)" required>
                            <input type="number" className="pf-input" value={form.investedAmount} onChange={F('investedAmount')} required min="0" placeholder="0" />
                        </Field>
                    </div>
                    <div className="pf-row2">
                        <Field label="Equity %" required>
                            <input type="number" className="pf-input" value={form.equityPercent} onChange={F('equityPercent')} required min="0" max="100" step="0.01" placeholder="0.00" />
                        </Field>
                        <Field label="Founder Name">
                            <input className="pf-input" value={form.founderName} onChange={F('founderName')} placeholder="Optional" />
                        </Field>
                    </div>
                    {implied && (
                        <div className="pf-implied">
                            <span>Implied equity at entry valuation</span>
                            <span className="pf-implied-val mono">{implied}%</span>
                        </div>
                    )}
                    <Field label="Description">
                        <textarea className="pf-input" rows={2} value={form.description} onChange={F('description')} placeholder="What does this company do?" style={{ resize: 'vertical' }} />
                    </Field>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="pf-btn-gold" disabled={isLoading} onClick={() => {
                            onSubmit({ ...form, entryValuation: +form.entryValuation, investedAmount: +form.investedAmount, equityPercent: +form.equityPercent });
                        }}>{isLoading ? 'Adding…' : 'Add Investment'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, required, children }: any) {
    return (
        <div className="pf-field">
            <label className="pf-label">{label}{required && <span className="pf-req">*</span>}</label>
            {children}
        </div>
    );
}

/* ── All Styles ── */
function PortfolioStyles() {
    return (
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap');

/* ── Tokens ── */
:root {
    --gold:    #C5A454;
    --gold-lt: rgba(197,164,84,.15);
    --gold-bd: rgba(197,164,84,.25);
    --bg:      var(--color-bg, #080f1a);
    --card:    var(--color-card-bg, #0c1520);
    --bd:      var(--color-border-light, rgba(255,255,255,.07));
    --t1:      var(--color-text-primary, #f0ead8);
    --t2:      var(--color-text-secondary, #8b9bb4);
    --t3:      var(--color-text-muted, #4a5568);
    --green:   #34d399;
    --red:     #f87171;
    --r-sm:    8px;
    --r-md:    12px;
    --r-lg:    16px;
}

/* ── Root ── */
.pf-root { padding: 0 0 64px; font-family:'Outfit',sans-serif; }

/* ── Header ── */
.pf-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:36px; flex-wrap:wrap; gap:16px; }
.pf-eyebrow { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:2px; color:var(--gold); margin-bottom:6px; }
.pf-title { font-family:'DM Serif Display',serif; font-size:32px; font-weight:400; color:var(--t1); letter-spacing:-.5px; line-height:1; }
.pf-header-right { display:flex; gap:10px; align-items:center; }

/* ── Buttons ── */
.pf-btn-gold {
    display:inline-flex; align-items:center; gap:7px; background:var(--gold);
    color:#0a0f18; font-size:12px; font-weight:700; letter-spacing:.3px;
    padding:9px 18px; border-radius:var(--r-sm); border:none; cursor:pointer;
    transition:opacity .15s, transform .1s;
}
.pf-btn-gold:hover { opacity:.9; transform:translateY(-1px); }
.pf-btn-gold:active { transform:translateY(0); }
.pf-btn-ghost {
    display:inline-flex; align-items:center; gap:7px;
    background:rgba(255,255,255,.04); border:1px solid var(--bd);
    color:var(--t2); font-size:12px; font-weight:600; padding:9px 16px;
    border-radius:var(--r-sm); cursor:pointer; transition:all .15s;
}
.pf-btn-ghost:hover { border-color:var(--gold-bd); color:var(--t1); }

/* ── Stats ── */
.pf-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
@media(max-width:900px){.pf-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px){.pf-stats{grid-template-columns:1fr;}}

.pf-stat {
    position:relative; background:var(--card); border:1px solid var(--bd);
    border-radius:var(--r-lg); padding:22px 22px 20px; overflow:hidden;
    animation: fadeSlideUp .5s cubic-bezier(.16,1,.3,1) both;
    animation-delay: calc(var(--i) * 80ms);
}
.pf-stat-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; color:var(--t3); margin-bottom:12px; }
.pf-stat-value { font-family:'DM Serif Display',serif; font-size:28px; color:var(--t1); line-height:1; margin-bottom:8px; letter-spacing:-.5px; }
.pf-stat-sub   { font-size:11px; color:var(--t3); display:flex; align-items:center; }
.pf-stat-accent-line { position:absolute; bottom:0; left:0; right:0; height:2px; opacity:.7; }

/* ── Toolbar ── */
.pf-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.pf-search-wrap { display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--bd); border-radius:var(--r-sm); padding:8px 12px; flex:1; min-width:200px; max-width:300px; transition:border-color .15s; }
.pf-search-wrap:focus-within { border-color:var(--gold-bd); }
.pf-search-icon { color:var(--t3); flex-shrink:0; }
.pf-search { background:none; border:none; outline:none; color:var(--t1); font-size:12.5px; font-family:'Outfit',sans-serif; width:100%; }
.pf-search::placeholder { color:var(--t3); }
.pf-search-clear { background:none; border:none; cursor:pointer; color:var(--t3); display:flex; padding:0; }
.pf-search-clear:hover { color:var(--t1); }

.pf-filter-group { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.pf-toolbar-right { margin-left:auto; display:flex; align-items:center; gap:8px; }

/* ── Drop Filters ── */
.pf-drop-wrap { position:relative; }
.pf-drop-btn {
    display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--bd);
    border-radius:var(--r-sm); padding:7px 11px; cursor:pointer; transition:all .15s; white-space:nowrap;
    font-family:'Outfit',sans-serif;
}
.pf-drop-btn:hover { border-color:var(--gold-bd); }
.pf-drop-btn.active { border-color:var(--gold-bd); background:var(--gold-lt); }
.pf-drop-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--t3); }
.pf-drop-val   { font-size:11.5px; font-weight:600; color:var(--t1); }
.pf-drop-btn.active .pf-drop-val { color:var(--gold); }
.pf-drop-menu {
    position:absolute; top:calc(100% + 6px); left:0; min-width:170px; z-index:60;
    background:var(--card); border:1px solid var(--bd); border-radius:var(--r-md);
    box-shadow:0 20px 60px rgba(0,0,0,.6); overflow:hidden;
    animation:dropIn .15s ease;
}
@keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
.pf-drop-item {
    display:flex; align-items:center; gap:8px; width:100%; padding:9px 13px;
    font-size:12px; font-weight:500; color:var(--t2); background:none; border:none;
    cursor:pointer; text-align:left; font-family:'Outfit',sans-serif; transition:background .1s;
}
.pf-drop-item:hover { background:rgba(255,255,255,.04); color:var(--t1); }
.pf-drop-item.sel { color:var(--gold); font-weight:700; }

.pf-clear-btn {
    display:inline-flex; align-items:center; gap:5px; background:none; border:1px solid var(--bd);
    border-radius:var(--r-sm); padding:7px 11px; font-size:11px; font-weight:600; color:var(--t3);
    cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s;
}
.pf-clear-btn:hover { border-color:var(--gold-bd); color:var(--gold); }

/* ── View Switch ── */
.pf-view-switch { display:flex; background:rgba(255,255,255,.03); border:1px solid var(--bd); border-radius:var(--r-sm); overflow:hidden; }
.pf-view-btn { padding:7px 11px; background:none; border:none; cursor:pointer; color:var(--t3); display:flex; transition:all .15s; }
.pf-view-btn.on { background:var(--card); color:var(--t1); }

/* ── Meta bar ── */
.pf-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
.pf-meta-count { font-size:11.5px; color:var(--t3); }
.pf-sort-pills { display:flex; gap:4px; flex-wrap:wrap; }
.pf-sort-pill {
    background:none; border:1px solid transparent; border-radius:20px; padding:4px 11px;
    font-size:11px; font-weight:500; color:var(--t3); cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s;
}
.pf-sort-pill:hover { border-color:var(--bd); color:var(--t2); }
.pf-sort-pill.active { border-color:var(--gold-bd); color:var(--gold); background:var(--gold-lt); font-weight:700; }
.pf-sort-dir { margin-left:4px; }

/* ── Table Card ── */
.pf-table-card { background:var(--card); border:1px solid var(--bd); border-radius:var(--r-lg); overflow:hidden; }
.pf-table { width:100%; border-collapse:collapse; }
.pf-table thead tr { border-bottom:1px solid var(--bd); }
.pf-table th {
    padding:11px 18px; font-size:10px; font-weight:600; text-transform:uppercase;
    letter-spacing:1.2px; color:var(--t3); text-align:left; white-space:nowrap;
}
.pf-table th.sort { cursor:pointer; user-select:none; }
.pf-table th.sort:hover { color:var(--t2); }
.pf-table th.num { text-align:right; }
.pf-table td { padding:13px 18px; font-size:13px; color:var(--t1); border-bottom:1px solid rgba(255,255,255,.028); }
.pf-table td.num { text-align:right; }
.pf-table td.mono { font-family:'DM Mono',monospace; font-size:12.5px; color:var(--t2); }
.pf-table td.fw { font-weight:500; }

.pf-tr-in { animation: fadeSlideUp .4s cubic-bezier(.16,1,.3,1) both; }
.pf-table tbody tr { transition:background .18s; cursor:pointer; }
.pf-table tbody tr:hover td { background:rgba(197,164,84,.04); }
.pf-table tbody tr:last-child td { border-bottom:none; }

/* ── Co cell ── */
.pf-co-cell { display:flex; align-items:center; gap:12px; }
.pf-avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-family:'DM Serif Display',serif; font-size:16px; flex-shrink:0; }
.pf-avatar.lg { width:40px; height:40px; font-size:17px; }
.pf-co-name { font-size:13.5px; font-weight:600; color:var(--t1); margin-bottom:4px; }
.pf-co-stage { display:inline-block; font-size:9.5px; font-weight:700; letter-spacing:.4px; padding:2px 8px; border-radius:20px; text-transform:uppercase; }

.pf-sector { font-size:11px; font-weight:600; padding:3px 9px; border-radius:6px; background:rgba(255,255,255,.04); color:var(--t3); border:1px solid var(--bd); white-space:nowrap; }

/* ── MOIC bar ── */
.pf-moic-cell { display:flex; align-items:center; gap:8px; justify-content:flex-end; }
.pf-moic-track { width:48px; height:3px; border-radius:2px; background:rgba(255,255,255,.06); overflow:hidden; }
.pf-moic-fill  { height:100%; background:var(--gold); border-radius:2px; transition:width .6s ease; }

/* ── Status ── */
.pf-status { display:inline-flex; align-items:center; gap:6px; border-radius:20px; font-size:10.5px; font-weight:700; padding:4px 10px; white-space:nowrap; }
.pf-status-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
@keyframes pulse-dot { 0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)} 70%{box-shadow:0 0 0 5px rgba(52,211,153,0)} 100%{box-shadow:0 0 0 0 rgba(52,211,153,0)} }
.pf-status-dot.pulse { animation:pulse-dot 2.2s infinite; }

/* ── Row link ── */
.pf-row-link { background:none; border:none; cursor:pointer; color:var(--t3); padding:4px; display:flex; border-radius:6px; transition:all .15s; }
.pf-row-link:hover { color:var(--t1); background:rgba(255,255,255,.06); }

/* ── Card Grid ── */
.pf-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:14px; }

.pf-card {
    position:relative; background:var(--card); border:1px solid var(--bd); border-radius:var(--r-lg);
    padding:20px; cursor:pointer; transition:border-color .2s, transform .2s, box-shadow .2s;
    overflow:hidden;
}
.pf-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(197,164,84,.04),transparent 60%); opacity:0; transition:opacity .2s; }
.pf-card:hover { border-color:var(--gold-bd); transform:translateY(-3px); box-shadow:0 16px 40px rgba(0,0,0,.4),0 0 0 1px rgba(197,164,84,.1); }
.pf-card:hover::before { opacity:1; }

.pf-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; gap:8px; }
.pf-card-divider { height:1px; background:var(--bd); margin-bottom:14px; }
.pf-card-metrics { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.pf-metric-box { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.04); border-radius:var(--r-sm); padding:10px 12px; }
.pf-metric-label { font-size:9.5px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--t3); margin-bottom:5px; }
.pf-metric-val { font-family:'DM Mono',monospace; font-size:14px; font-weight:500; }

.pf-card-arrow { position:absolute; bottom:16px; right:16px; color:var(--t3); opacity:0; transition:opacity .2s; }
.pf-card:hover .pf-card-arrow { opacity:1; }

/* ── Pagination ── */
.pf-pag { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-top:1px solid var(--bd); flex-wrap:wrap; gap:8px; }
.pf-pag-info { font-size:11.5px; color:var(--t3); }
.pf-pag-btns { display:flex; gap:4px; align-items:center; }
.pf-pag-btn {
    width:30px; height:30px; border-radius:var(--r-sm); border:1px solid var(--bd);
    background:rgba(255,255,255,.02); color:var(--t3); display:flex; align-items:center; justify-content:center;
    cursor:pointer; font-size:11.5px; font-weight:600; font-family:'Outfit',sans-serif; transition:all .15s;
}
.pf-pag-btn:hover:not(:disabled) { border-color:var(--gold-bd); color:var(--t1); }
.pf-pag-btn:disabled { opacity:.3; cursor:default; }
.pf-pag-btn.on { background:var(--gold-lt); border-color:var(--gold-bd); color:var(--gold); }
.pf-pag-ellipsis { color:var(--t3); padding:0 4px; font-size:12px; }

/* ── Skeletons ── */
.pf-skeletons { display:flex; flex-direction:column; gap:8px; }
.pf-skeleton { height:60px; border-radius:var(--r-md); background:linear-gradient(90deg,var(--card) 25%,rgba(255,255,255,.03) 50%,var(--card) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── No results ── */
.pf-no-results { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:72px 20px; color:var(--t3); font-size:13px; background:var(--card); border:1px solid var(--bd); border-radius:var(--r-lg); gap:12px; }
.pf-no-results-icon { width:52px; height:52px; border-radius:14px; border:1px dashed rgba(255,255,255,.1); display:flex; align-items:center; justify-content:center; color:var(--t3); }
.pf-no-results p { margin:0; }

/* ── Empty ── */
.pf-empty-root { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:65vh; gap:12px; }
.pf-empty-icon { width:72px; height:72px; border-radius:18px; border:1.5px dashed var(--gold-bd); background:var(--gold-lt); display:flex; align-items:center; justify-content:center; color:var(--gold); margin-bottom:8px; }
.pf-empty-title { font-family:'DM Serif Display',serif; font-size:24px; color:var(--t1); margin:0; }
.pf-empty-sub { font-size:13px; color:var(--t2); margin:0 0 8px; text-align:center; max-width:300px; }

/* ── Modal ── */
.pf-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(8px); padding:16px; animation:fadeIn .15s ease; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.pf-modal { background:var(--card); border:1px solid rgba(255,255,255,.1); border-radius:20px; width:100%; max-width:500px; max-height:92vh; overflow-y:auto; box-shadow:0 32px 80px rgba(0,0,0,.7); animation:modalIn .2s cubic-bezier(.16,1,.3,1); }
@keyframes modalIn { from{opacity:0;transform:scale(.97) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
.pf-modal-head { display:flex; align-items:center; justify-content:space-between; padding:22px 24px 0; }
.pf-modal-title { font-family:'DM Serif Display',serif; font-size:20px; color:var(--t1); }
.pf-modal-close { background:rgba(255,255,255,.06); border:1px solid var(--bd); border-radius:8px; cursor:pointer; color:var(--t2); width:30px; height:30px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.pf-modal-close:hover { background:rgba(255,255,255,.1); color:var(--t1); }
.pf-modal-body { padding:20px 24px 24px; display:flex; flex-direction:column; gap:14px; }
.pf-modal-footer { display:flex; gap:10px; padding-top:4px; }
.pf-modal-footer .pf-btn-ghost, .pf-modal-footer .pf-btn-gold { flex:1; justify-content:center; }

/* ── Form ── */
.pf-field { display:flex; flex-direction:column; gap:6px; }
.pf-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.8px; color:var(--t3); }
.pf-req { color:var(--gold); margin-left:3px; }
.pf-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.pf-input {
    background:rgba(255,255,255,.04); border:1px solid var(--bd); border-radius:var(--r-sm);
    padding:10px 12px; font-size:13px; font-family:'Outfit',sans-serif; color:var(--t1);
    outline:none; width:100%; box-sizing:border-box; transition:border-color .15s;
    -webkit-appearance:none;
}
.pf-input:focus { border-color:var(--gold-bd); background:rgba(197,164,84,.04); }
.pf-select { cursor:pointer; }
.pf-implied { display:flex; justify-content:space-between; align-items:center; background:var(--gold-lt); border:1px solid var(--gold-bd); border-radius:var(--r-sm); padding:11px 14px; }
.pf-implied span:first-child { font-size:11.5px; color:var(--t2); }
.pf-implied-val { font-size:15px; font-weight:700; color:var(--gold); }

/* ── Global ── */
.mono { font-family:'DM Mono',monospace !important; }
.fw { font-weight:500; }
@keyframes fadeSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
    );
}
