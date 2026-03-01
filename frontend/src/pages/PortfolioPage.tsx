/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Briefcase, X, Download,
    ChevronDown, ChevronLeft, ChevronRight, Search,
    LayoutGrid, List, ArrowUpDown,
    ExternalLink, CheckCircle2
} from 'lucide-react';
import { startupsAPI } from '../services/api';
import { formatCurrencyCompact, formatPercent, paiseToRupees } from '../utils/formatters';
import { invalidateInvestmentQueries } from '../utils/invalidation';
import toast from 'react-hot-toast';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'];
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgriTech', 'SaaS', 'DeepTech', 'Consumer', 'Other'];

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
    'Pre-Seed': { bg: 'rgba(167,139,250,.12)', color: '#a78bfa' },
    'Seed': { bg: 'rgba(251,191,36,.12)', color: '#fbbf24' },
    'Series A': { bg: 'rgba(52,211,153,.12)', color: '#34d399' },
    'Series B': { bg: 'rgba(96,165,250,.12)', color: '#60a5fa' },
    'Series C': { bg: 'rgba(249,115,22,.12)', color: '#f97316' },
    'Growth': { bg: 'rgba(197,164,84,.12)', color: '#C5A454' },
    'Pre-IPO': { bg: 'rgba(236,72,153,.12)', color: '#ec4899' },
};

type SortKey = 'name' | 'invested' | 'currentValue' | 'xirr' | 'moic';
type ViewMode = 'table' | 'grid';

export default function PortfolioPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [sectorFilter, setSectorFilter] = useState<string>('');
    const [stageFilter, setStageFilter] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [sortKey, setSortKey] = useState<SortKey>('invested');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 8;

    // Dropdowns
    const [openDrop, setOpenDrop] = useState<string | null>(null);

    const { data: startups, isLoading } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => {
            const res = await startupsAPI.getAll();
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => startupsAPI.create(data),
        onSuccess: () => {
            invalidateInvestmentQueries(queryClient);
            setShowAddModal(false);
            toast.success('Investment added successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to add investment');
        },
    });

    const filtered = useMemo(() => {
        if (!startups) return [];
        let list = [...startups];

        if (search) list = list.filter((s: any) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.sector.toLowerCase().includes(search.toLowerCase()) ||
            s.stage.toLowerCase().includes(search.toLowerCase())
        );
        if (statusFilter) list = list.filter((s: any) => s.status === statusFilter);
        if (sectorFilter) list = list.filter((s: any) => s.sector === sectorFilter);
        if (stageFilter) list = list.filter((s: any) => s.stage === stageFilter);

        list.sort((a: any, b: any) => {
            let av = 0, bv = 0;
            if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            if (sortKey === 'invested') { av = a.metrics.invested; bv = b.metrics.invested; }
            if (sortKey === 'currentValue') { av = a.metrics.currentValue; bv = b.metrics.currentValue; }
            if (sortKey === 'xirr') { av = a.metrics.xirr || 0; bv = b.metrics.xirr || 0; }
            if (sortKey === 'moic') { av = a.metrics.moic || 0; bv = b.metrics.moic || 0; }
            return sortDir === 'asc' ? av - bv : bv - av;
        });

        return list;
    }, [startups, search, statusFilter, sectorFilter, stageFilter, sortKey, sortDir]);

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const totalInvested = (startups || []).reduce((s: number, x: any) => s + x.metrics.invested, 0);
    const currentValue = (startups || []).reduce((s: number, x: any) => s + x.metrics.currentValue, 0);
    const activeCount = (startups || []).filter((x: any) => x.status === 'active').length;
    const portfolioGain = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) : 0;

    const handleExport = () => {
        if (!startups) return;
        const headers = ['Company Name', 'Sector', 'Stage', 'Status', 'Invested Amount', 'Current Value', 'MOIC', 'IRR'];
        const csvRows = [headers.join(',')];
        for (const s of startups) {
            const row = [
                `"${s.name}"`,
                `"${s.sector}"`,
                `"${s.stage}"`,
                `"${s.status}"`,
                `"${paiseToRupees(s.metrics.invested)}"`,
                `"${paiseToRupees(s.metrics.currentValue)}"`,
                `"${s.metrics.moic}x"`,
                `"${formatPercent(s.metrics.xirr)}"`
            ];
            csvRows.push(row.join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Portfolio_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const clearFilters = () => {
        setSearch(''); setStatusFilter(''); setSectorFilter(''); setStageFilter('');
        setPage(1);
    };
    const hasFilters = search || statusFilter || sectorFilter || stageFilter;

    const closeDrops = () => setOpenDrop(null);

    if (!isLoading && (!startups || startups.length === 0)) {
        return (
            <EmptyState onAdd={() => setShowAddModal(true)}>
                {showAddModal && <AddInvestmentModal onClose={() => setShowAddModal(false)} onSubmit={(d: any) => createMutation.mutate(d)} isLoading={createMutation.isPending} />}
            </EmptyState>
        );
    }

    return (
        <>
            <style>{`
                /* ── Portfolio Page Styles ── */
                .pp-wrap { padding: 0 0 48px; }

                /* header */
                .pp-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
                .pp-title  { font-size:24px; font-weight:800; color:var(--color-text-primary); letter-spacing:-.5px; line-height:1.1; }
                .pp-sub    { font-size:13px; color:var(--color-text-muted); margin-top:4px; }

                /* stat cards */
                .pp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
                @media(max-width:900px){ .pp-stats{ grid-template-columns:repeat(2,1fr); } }
                @media(max-width:480px){ .pp-stats{ grid-template-columns:1fr; } }
                .pp-stat { background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:14px; padding:18px 20px; position:relative; overflow:hidden; }
                .pp-stat-lbl { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:var(--color-text-muted); margin-bottom:10px; }
                .pp-stat-val { font-size:26px; font-weight:800; font-family:var(--font-mono,'JetBrains Mono',monospace); color:var(--color-text-primary); letter-spacing:-1px; line-height:1; }
                .pp-stat-sub { font-size:11px; margin-top:7px; display:flex; align-items:center; gap:3px; }
                .pp-stat-glow { position:absolute; right:-24px; bottom:-24px; width:80px; height:80px; border-radius:50%; opacity:.07; }

                /* filter bar */
                .pp-filterbar { display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
                .pp-search { display:flex; align-items:center; gap:8px; background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:10px; padding:8px 14px; min-width:220px; flex:1; max-width:320px; }
                .pp-search input { background:none; border:none; outline:none; color:var(--color-text-primary); font-size:13px; width:100%; }
                .pp-search input::placeholder { color:var(--color-text-muted); }

                /* dropdown */
                .pp-drop-wrap { position:relative; }
                .pp-drop-btn  { display:flex; align-items:center; gap:6px; background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:10px; padding:8px 14px; font-size:12px; font-weight:600; color:var(--color-text-secondary); cursor:pointer; white-space:nowrap; transition:border-color .15s; }
                .pp-drop-btn:hover, .pp-drop-btn.active { border-color:rgba(197,164,84,.5); color:var(--color-primary,#C5A454); }
                .pp-drop-btn svg { opacity:.6; }
                .pp-drop-menu { position:absolute; top:calc(100% + 6px); left:0; background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:12px; min-width:160px; z-index:50; box-shadow:0 16px 48px rgba(0,0,0,.5); overflow:hidden; }
                .pp-drop-item { display:flex; align-items:center; gap:8px; padding:9px 14px; font-size:12px; font-weight:500; color:var(--color-text-secondary); cursor:pointer; transition:background .1s; }
                .pp-drop-item:hover { background:var(--color-bg-hover); color:var(--color-text-primary); }
                .pp-drop-item.selected { color:var(--color-primary,#C5A454); font-weight:700; }
                .pp-drop-divider { height:1px; background:var(--color-border-light); margin:4px 0; }

                /* view toggle */
                .pp-view-tog { display:flex; background:var(--color-bg-hover); border:1px solid var(--color-border-light); border-radius:10px; overflow:hidden; }
                .pp-view-btn { padding:7px 12px; font-size:12px; cursor:pointer; color:var(--color-text-muted); border:none; background:none; transition:all .15s; }
                .pp-view-btn.active { background:var(--color-card-bg,#0f1c2e); color:var(--color-text-primary); }

                /* clear filters */
                .pp-clear { font-size:12px; color:var(--color-text-muted); cursor:pointer; text-decoration:underline; white-space:nowrap; }
                .pp-clear:hover { color:var(--color-primary,#C5A454); }

                /* table */
                .pp-table-wrap { background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:14px; overflow:hidden; }
                .pp-table { width:100%; border-collapse:collapse; }
                .pp-table th { padding:11px 20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--color-text-muted); text-align:left; border-bottom:1px solid var(--color-border-light); white-space:nowrap; }
                .pp-table th.sortable { cursor:pointer; user-select:none; }
                .pp-table th.sortable:hover { color:var(--color-text-primary); }
                .pp-table th .sort-icon { display:inline-flex; margin-left:4px; opacity:.4; vertical-align:middle; }
                .pp-table th .sort-icon.active { opacity:1; color:var(--color-primary,#C5A454); }
                .pp-table td { padding:13px 20px; border-bottom:1px solid rgba(255,255,255,.03); font-size:13px; color:var(--color-text-primary); }
                .pp-table tr { transition:background .2s; }
                .pp-table tr:hover td { background:rgba(197,164,84,.06); cursor:pointer; }

                /* company cell */
                .pp-co-logo { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; }
                .pp-co-name { font-size:13px; font-weight:700; color:var(--color-text-primary); }
                .pp-co-stage { font-size:10px; color:var(--color-text-muted); margin-top:1px; }

                /* badges */
                .pp-badge { display:inline-flex; align-items:center; gap:5px; border-radius:20px; font-size:11px; font-weight:700; padding:3px 9px; }
                .pp-badge-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
                @keyframes pulse-active { 0% { box-shadow:0 0 0 0 rgba(74,222,128,.4); } 70% { box-shadow:0 0 0 4px rgba(74,222,128,0); } 100% { box-shadow:0 0 0 0 rgba(74,222,128,0); } }
                .pp-badge-dot.pulse { animation:pulse-active 2s infinite cubic-bezier(0.16,1,0.3,1); }
                .pp-sector-tag { display:inline-block; font-size:11px; font-weight:600; padding:3px 9px; border-radius:6px; background:rgba(255,255,255,.05); color:var(--color-text-muted); border:1px solid var(--color-border-light); }

                /* moic bar */
                .moic-bar-wrap { display:flex; align-items:center; gap:8px; }
                .moic-bar-bg { flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,.07); overflow:hidden; max-width:60px; }
                .moic-bar-fill { height:100%; border-radius:2px; background:#C5A454; }

                /* pagination */
                .pp-pag { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-top:1px solid var(--color-border-light); flex-wrap:wrap; gap:8px; }
                .pp-pag-info { font-size:12px; color:var(--color-text-muted); }
                .pp-pag-btns { display:flex; gap:4px; align-items:center; }
                .pp-pag-btn { width:32px; height:32px; border-radius:8px; border:1px solid var(--color-border-light); background:rgba(255,255,255,.03); color:var(--color-text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; font-weight:600; transition:all .15s; }
                .pp-pag-btn:hover:not(:disabled) { border-color:rgba(197,164,84,.4); color:var(--color-text-primary); }
                .pp-pag-btn:disabled { opacity:.35; cursor:default; }
                .pp-pag-btn.current { background:rgba(197,164,84,.15); border-color:rgba(197,164,84,.4); color:var(--color-primary,#C5A454); }

                /* card grid */
                .pp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
                .pp-card { background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:14px; padding:20px; cursor:pointer; transition:all .2s cubic-bezier(0.16,1,0.3,1); }
                .pp-card:hover { border-color:rgba(197,164,84,.4); transform:translateY(-2px); box-shadow:0 12px 24px rgba(0,0,0,.4), 0 0 20px rgba(197,164,84,.1); }
                .pp-card-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
                .pp-card-metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
                .pp-card-metric { background:rgba(255,255,255,.03); border-radius:9px; padding:10px; }
                .pp-card-metric-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--color-text-muted); margin-bottom:4px; }
                .pp-card-metric-val { font-size:14px; font-weight:700; font-family:var(--font-mono,monospace); color:var(--color-text-primary); }

                /* btn */
                .btn { display:inline-flex; align-items:center; gap:6px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; border:none; padding:9px 18px; }
                .btn-primary { background:var(--color-primary,#C5A454); color:#000; }
                .btn-primary:hover { opacity:.9; }
                .btn-secondary { background:var(--color-bg-hover); border:1px solid var(--color-border-light); color:var(--color-text-secondary); }
                .btn-secondary:hover { border-color:rgba(197,164,84,.4); color:var(--color-text-primary); }

                /* modal */
                .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); display:flex; align-items:center; justify-content:center; z-index:100; backdrop-filter:blur(5px); padding:16px; }
                .modal-content { background:var(--color-card-bg,#0f1c2e); border:1px solid var(--color-border-light); border-radius:18px; padding:28px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; }
                .input { width:100%; background:var(--color-bg-hover); border:1px solid var(--color-border-light); border-radius:9px; padding:9px 12px; font-size:13px; color:var(--color-text-primary); outline:none; box-sizing:border-box; transition:border-color .15s; }
                .input:focus { border-color:rgba(197,164,84,.5); }
                .select { width:100%; background:var(--color-bg-hover); border:1px solid var(--color-border-light); border-radius:9px; padding:9px 12px; font-size:13px; color:var(--color-text-primary); outline:none; appearance:none; cursor:pointer; }

                /* results info */
                .pp-results-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
                .pp-results-count { font-size:12px; color:var(--color-text-muted); }

                /* empty */
                .pp-empty { text-align:center; padding:60px 20px; color:var(--color-text-muted); font-size:13px; }
            `}</style>

            <div className="pp-wrap" onClick={closeDrops}>
                {/* Header */}
                <div className="pp-header">
                    <div>
                        <h1 className="pp-title">Portfolio</h1>
                        <p className="pp-sub">Track and manage your angel investments</p>
                    </div>
                    <div className="pp-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button title="Export portfolio data as CSV" className="btn btn-secondary" onClick={handleExport} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                            <Download size={16} strokeWidth={2} />
                            Export CSV
                        </button>
                        <button title="Add a new investment" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <Plus size={16} strokeWidth={2.5} />
                            Add Investment
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="pp-stats">
                    {[
                        {
                            label: 'Total Invested',
                            value: formatCurrencyCompact(paiseToRupees(totalInvested)),
                            sub: `across ${(startups || []).length} companies`,
                            subColor: 'var(--color-text-muted)',
                            glow: '#C5A454',
                        },
                        {
                            label: 'Portfolio Value',
                            value: formatCurrencyCompact(paiseToRupees(currentValue)),
                            sub: portfolioGain >= 0
                                ? `↑ +${(portfolioGain * 100).toFixed(1)}% unrealised`
                                : `↓ ${(portfolioGain * 100).toFixed(1)}% unrealised`,
                            subColor: portfolioGain >= 0 ? 'var(--color-green,#22c55e)' : 'var(--color-red,#ef4444)',
                            glow: portfolioGain >= 0 ? '#22c55e' : '#ef4444',
                        },
                        {
                            label: 'Active Holdings',
                            value: String(activeCount),
                            sub: `${(startups || []).length - activeCount} exited / written off`,
                            subColor: 'var(--color-text-muted)',
                            glow: '#60a5fa',
                        },
                        {
                            label: 'Filtered Results',
                            value: String(filtered.length),
                            sub: hasFilters ? 'filters applied' : 'all companies',
                            subColor: hasFilters ? 'var(--color-primary,#C5A454)' : 'var(--color-text-muted)',
                            glow: '#a78bfa',
                        },
                    ].map((card, i) => (
                        <div className="pp-stat" key={i}>
                            <div className="pp-stat-lbl">{card.label}</div>
                            <div className="pp-stat-val">{card.value}</div>
                            <div className="pp-stat-sub" style={{ color: card.subColor }}>{card.sub}</div>
                            <div className="pp-stat-glow" style={{ background: card.glow }} />
                        </div>
                    ))}
                </div>

                {/* Filter Bar */}
                <div className="pp-filterbar">
                    {/* Search */}
                    <div className="pp-search">
                        <Search size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Search startup, sector, stage…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && (
                            <X size={12} style={{ cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0 }}
                                onClick={() => { setSearch(''); setPage(1); }} />
                        )}
                    </div>

                    {/* Status dropdown */}
                    <div className="pp-drop-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className={`pp-drop-btn${statusFilter ? ' active' : ''}`}
                            onClick={() => setOpenDrop(openDrop === 'status' ? null : 'status')}
                        >
                            Status: {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All'}
                            <ChevronDown size={13} />
                        </button>
                        {openDrop === 'status' && (
                            <div className="pp-drop-menu">
                                {['', 'active', 'exited', 'written_off'].map(v => (
                                    <div key={v} className={`pp-drop-item${statusFilter === v ? ' selected' : ''}`}
                                        onClick={() => { setStatusFilter(v); setPage(1); setOpenDrop(null); }}>
                                        {statusFilter === v && <CheckCircle2 size={12} />}
                                        {v === '' ? 'All statuses' : v === 'written_off' ? 'Written Off' : v.charAt(0).toUpperCase() + v.slice(1)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sector dropdown */}
                    <div className="pp-drop-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className={`pp-drop-btn${sectorFilter ? ' active' : ''}`}
                            onClick={() => setOpenDrop(openDrop === 'sector' ? null : 'sector')}
                        >
                            {sectorFilter || 'Sector: All'}
                            <ChevronDown size={13} />
                        </button>
                        {openDrop === 'sector' && (
                            <div className="pp-drop-menu">
                                <div className={`pp-drop-item${!sectorFilter ? ' selected' : ''}`}
                                    onClick={() => { setSectorFilter(''); setPage(1); setOpenDrop(null); }}>
                                    {!sectorFilter && <CheckCircle2 size={12} />} All sectors
                                </div>
                                <div className="pp-drop-divider" />
                                {SECTORS.map(s => (
                                    <div key={s} className={`pp-drop-item${sectorFilter === s ? ' selected' : ''}`}
                                        onClick={() => { setSectorFilter(s); setPage(1); setOpenDrop(null); }}>
                                        {sectorFilter === s && <CheckCircle2 size={12} />} {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stage dropdown */}
                    <div className="pp-drop-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className={`pp-drop-btn${stageFilter ? ' active' : ''}`}
                            onClick={() => setOpenDrop(openDrop === 'stage' ? null : 'stage')}
                        >
                            {stageFilter || 'Stage: All'}
                            <ChevronDown size={13} />
                        </button>
                        {openDrop === 'stage' && (
                            <div className="pp-drop-menu">
                                <div className={`pp-drop-item${!stageFilter ? ' selected' : ''}`}
                                    onClick={() => { setStageFilter(''); setPage(1); setOpenDrop(null); }}>
                                    {!stageFilter && <CheckCircle2 size={12} />} All stages
                                </div>
                                <div className="pp-drop-divider" />
                                {STAGES.map(s => (
                                    <div key={s} className={`pp-drop-item${stageFilter === s ? ' selected' : ''}`}
                                        onClick={() => { setStageFilter(s); setPage(1); setOpenDrop(null); }}>
                                        {stageFilter === s && <CheckCircle2 size={12} />} {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasFilters && (
                        <button className="pp-clear" onClick={clearFilters}>Clear all</button>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* View toggle */}
                    <div className="pp-view-tog">
                        <button
                            className={`pp-view-btn${viewMode === 'table' ? ' active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table view"
                        >
                            <List size={14} />
                        </button>
                        <button
                            className={`pp-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid view"
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>

                {/* Results info */}
                <div className="pp-results-bar">
                    <span className="pp-results-count">
                        {filtered.length === 0
                            ? 'No results'
                            : `${filtered.length} compan${filtered.length === 1 ? 'y' : 'ies'}`}
                        {hasFilters && ' matching filters'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Sort:&nbsp;
                        {(['invested', 'currentValue', 'xirr', 'moic', 'name'] as SortKey[]).map(k => (
                            <button
                                key={k}
                                onClick={() => toggleSort(k)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                                    color: sortKey === k ? 'var(--color-primary,#C5A454)' : 'var(--color-text-muted)',
                                    fontWeight: sortKey === k ? 700 : 500, marginRight: 10,
                                    textDecoration: sortKey === k ? 'underline' : 'none',
                                }}
                            >
                                {k === 'invested' ? 'Invested' : k === 'currentValue' ? 'Value' : k === 'xirr' ? 'IRR' : k === 'moic' ? 'MOIC' : 'Name'}
                                {sortKey === k && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                            </button>
                        ))}
                    </span>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="pp-table-wrap animate-shimmer" style={{ height: 64 }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="pp-table-wrap">
                        <div className="pp-empty">
                            No startups match your filters.{' '}
                            <button className="pp-clear" onClick={clearFilters}>Clear filters</button>
                        </div>
                    </div>
                ) : viewMode === 'table' ? (
                    <TableView
                        rows={paginated}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        onRowClick={(id: string) => navigate(`/portfolio/${id}`)}
                        page={page}
                        totalPages={totalPages}
                        totalCount={filtered.length}
                        pageSize={PAGE_SIZE}
                        onPage={setPage}
                    />
                ) : (
                    <>
                        <div className="pp-grid">
                            {paginated.map((s: any) => (
                                <CardItem key={s._id} startup={s} onClick={() => navigate(`/portfolio/${s._id}`)} />
                            ))}
                        </div>
                        <PaginationBar
                            page={page} totalPages={totalPages}
                            totalCount={filtered.length} pageSize={PAGE_SIZE}
                            onPage={setPage}
                        />
                    </>
                )}
            </div>

            {showAddModal && (
                <AddInvestmentModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={(d: any) => createMutation.mutate(d)}
                    isLoading={createMutation.isPending}
                />
            )}
        </>
    );
}

// ── Mini sparkline SVG ──
function Sparkline({ up }: { up: boolean }) {
    const pts = up
        ? '0,14 8,12 16,10 24,11 32,7 40,8 48,4 56,6 64,2'
        : '0,2 8,4 16,6 24,5 32,9 40,7 48,11 56,10 64,14';
    return (
        <svg width="48" height="12" viewBox="0 0 64 16" fill="none" style={{ marginLeft: 8, verticalAlign: 'middle', opacity: 0.6 }}>
            <polyline points={pts} stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}

const SortIcon = ({ k, sortKey }: { k: string, sortKey: string }) => (
    <span className={`sort-icon${sortKey === k ? ' active' : ''}`}>
        <ArrowUpDown size={11} />
    </span>
);

/* ─── Table View ─── */
function TableView({ rows, sortKey, onSort, onRowClick, page, totalPages, totalCount, pageSize, onPage }: any) {

    return (
        <div className="pp-table-wrap">
            <div style={{ overflowX: 'auto' }}>
                <table className="pp-table">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => onSort('name')}>
                                Company <SortIcon k="name" sortKey={sortKey} />
                            </th>
                            <th>Sector</th>
                            <th className="sortable" style={{ textAlign: 'right' }} onClick={() => onSort('invested')}>
                                Invested <SortIcon k="invested" sortKey={sortKey} />
                            </th>
                            <th className="sortable" style={{ textAlign: 'right' }} onClick={() => onSort('currentValue')}>
                                Value <SortIcon k="currentValue" sortKey={sortKey} />
                            </th>
                            <th className="sortable" style={{ textAlign: 'right' }} onClick={() => onSort('moic')}>
                                MOIC <SortIcon k="moic" sortKey={sortKey} />
                            </th>
                            <th className="sortable" style={{ textAlign: 'right' }} onClick={() => onSort('xirr')}>
                                IRR <SortIcon k="xirr" sortKey={sortKey} />
                            </th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s: any) => {
                            const moic = s.metrics.moic || 0;
                            const moicPct = Math.min(100, (moic / 5) * 100);
                            const stageStyle = STAGE_COLORS[s.stage] || { bg: 'rgba(255,255,255,.06)', color: 'var(--color-text-muted)' };
                            return (
                                <tr key={s._id} onClick={() => onRowClick(s._id)}>
                                    {/* Company */}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="pp-co-logo" style={{
                                                background: `hsl(${s.name.charCodeAt(0) * 10},55%,18%)`,
                                                color: `hsl(${s.name.charCodeAt(0) * 10},60%,70%)`,
                                                border: `1px solid hsl(${s.name.charCodeAt(0) * 10},45%,24%)`,
                                            }}>
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="pp-co-name">{s.name}</div>
                                                <div className="pp-co-stage">
                                                    <span style={{ ...stageStyle, fontSize: 10, padding: '1px 7px', borderRadius: 12, display: 'inline-block', fontWeight: 700, background: stageStyle.bg }}>
                                                        {s.stage}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Sector */}
                                    <td><span className="pp-sector-tag">{s.sector}</span></td>
                                    {/* Invested */}
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono,monospace)', color: 'var(--color-text-secondary)' }}>
                                        {formatCurrencyCompact(paiseToRupees(s.metrics.invested))}
                                    </td>
                                    {/* Value */}
                                    <td className="font-mono font-semibold" style={{ textAlign: 'right' }}>
                                        <span style={{ color: s.metrics.currentValue >= s.metrics.invested ? 'var(--color-green,#22c55e)' : 'var(--color-red,#ef4444)' }}>
                                            {formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}
                                            <Sparkline up={s.metrics.currentValue >= s.metrics.invested} />
                                        </span>
                                    </td>
                                    {/* MOIC */}
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="moic-bar-wrap" style={{ justifyContent: 'flex-end' }}>
                                            <div className="moic-bar-bg">
                                                <div className="moic-bar-fill" style={{ width: `${moicPct}%` }} />
                                            </div>
                                            <span style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 13, fontWeight: 700, color: moic >= 1 ? 'var(--color-primary,#C5A454)' : 'var(--color-red,#ef4444)', minWidth: 40, textAlign: 'right' }}>
                                                {moic.toFixed(2)}x
                                            </span>
                                        </div>
                                    </td>
                                    {/* IRR */}
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono,monospace)', fontWeight: 700 }}>
                                        <span style={{ color: (s.metrics.xirr || 0) >= 0 ? 'var(--color-green,#22c55e)' : 'var(--color-red,#ef4444)' }}>
                                            {formatPercent(s.metrics.xirr)}
                                        </span>
                                    </td>
                                    {/* Status */}
                                    <td style={{ textAlign: 'center' }}>
                                        <StatusBadge status={s.status} />
                                    </td>
                                    {/* Action */}
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, opacity: .6 }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </td>
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

/* ─── Card Item ─── */
function CardItem({ startup: s, onClick }: any) {
    const stageStyle = STAGE_COLORS[s.stage] || { bg: 'rgba(255,255,255,.06)', color: 'var(--color-text-muted)' };
    const gain = s.metrics.currentValue - s.metrics.invested;

    // Derive health badge from latest runway or MOIC
    let healthColor = 'var(--color-green,#22c55e)';
    let healthBg = 'rgba(74,222,128,0.12)';
    let healthLabel = 'Healthy';
    const moic = s.metrics.moic || 0;
    if (s.latestRunwayMonths !== undefined && s.latestRunwayMonths !== null) {
        if (s.latestRunwayMonths < 3) {
            healthColor = 'var(--color-red,#ef4444)'; healthBg = 'rgba(248,113,113,0.12)'; healthLabel = 'Critical';
        } else if (s.latestRunwayMonths < 6) {
            healthColor = 'var(--color-yellow,#fbbf24)'; healthBg = 'rgba(251,191,36,0.12)'; healthLabel = 'Warning';
        }
    } else if (moic < 0.5) {
        healthColor = 'var(--color-red,#ef4444)'; healthBg = 'rgba(248,113,113,0.12)'; healthLabel = 'At Risk';
    } else if (moic < 1) {
        healthColor = 'var(--color-yellow,#fbbf24)'; healthBg = 'rgba(251,191,36,0.12)'; healthLabel = 'Below Par';
    }

    return (
        <div className="pp-card" onClick={onClick}>
            <div className="pp-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="pp-co-logo" style={{
                        background: `hsl(${s.name.charCodeAt(0) * 10},55%,18%)`,
                        color: `hsl(${s.name.charCodeAt(0) * 10},60%,70%)`,
                        border: `1px solid hsl(${s.name.charCodeAt(0) * 10},45%,24%)`,
                    }}>
                        {s.name.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.sector}</div>
                    </div>
                </div>
                <StatusBadge status={s.status} />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700, background: stageStyle.bg, color: stageStyle.color }}>
                    {s.stage}
                </span>
                {s.status === 'active' && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700, background: healthBg, color: healthColor }}>
                        ● {healthLabel}
                    </span>
                )}
            </div>

            <div className="pp-card-metrics">
                <div className="pp-card-metric">
                    <div className="pp-card-metric-lbl">Invested</div>
                    <div className="pp-card-metric-val">{formatCurrencyCompact(paiseToRupees(s.metrics.invested))}</div>
                </div>
                <div className="pp-card-metric">
                    <div className="pp-card-metric-lbl">Value</div>
                    <div className="pp-card-metric-val" style={{ color: gain >= 0 ? 'var(--color-green,#22c55e)' : 'var(--color-red,#ef4444)' }}>
                        {formatCurrencyCompact(paiseToRupees(s.metrics.currentValue))}
                    </div>
                </div>
                <div className="pp-card-metric">
                    <div className="pp-card-metric-lbl">MOIC</div>
                    <div className="pp-card-metric-val" style={{ color: (s.metrics.moic || 0) >= 1 ? 'var(--color-primary,#C5A454)' : 'var(--color-red,#ef4444)' }}>
                        {(s.metrics.moic || 0).toFixed(2)}x
                    </div>
                </div>
                <div className="pp-card-metric">
                    <div className="pp-card-metric-lbl">IRR</div>
                    <div className="pp-card-metric-val" style={{ color: (s.metrics.xirr || 0) >= 0 ? 'var(--color-green,#22c55e)' : 'var(--color-red,#ef4444)' }}>
                        {formatPercent(s.metrics.xirr)}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { bg: string; color: string; dot: string; label: string }> = {
        active: { bg: 'rgba(34,197,94,.1)', color: '#22c55e', dot: '#22c55e', label: 'Active' },
        exited: { bg: 'rgba(122,128,152,.1)', color: '#7A8098', dot: '#7A8098', label: 'Exited' },
        written_off: { bg: 'rgba(239,68,68,.1)', color: '#ef4444', dot: '#ef4444', label: 'Written Off' },
    };
    const c = cfg[status] || cfg.exited;
    return (
        <span className="pp-badge" style={{ background: c.bg, color: c.color }}>
            <span className={`pp-badge-dot ${status === 'active' ? 'pulse' : ''}`} style={{ background: c.dot }} />
            {c.label}
        </span>
    );
}

/* ─── Pagination ─── */
function PaginationBar({ page, totalPages, totalCount, pageSize, onPage }: any) {
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);

    const pages = useMemo(() => {
        const arr: (number | '...')[] = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) arr.push(i);
            else if (arr[arr.length - 1] !== '...') arr.push('...');
        }
        return arr;
    }, [page, totalPages]);

    return (
        <div className="pp-pag">
            <span className="pp-pag-info">
                {totalCount === 0 ? 'No results' : `${from}–${to} of ${totalCount}`}
            </span>
            <div className="pp-pag-btns">
                <button className="pp-pag-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`e${i}`} style={{ color: 'var(--color-text-muted)', padding: '0 4px', fontSize: 12 }}>…</span>
                    ) : (
                        <button
                            key={p}
                            className={`pp-pag-btn${page === p ? ' current' : ''}`}
                            onClick={() => onPage(p)}
                        >
                            {p}
                        </button>
                    )
                )}
                <button className="pp-pag-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─── Empty State ─── */
function EmptyState({ onAdd, children }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{
                width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(197,164,84,.06)', border: '2px dashed rgba(197,164,84,.3)', marginBottom: 24,
            }}>
                <Briefcase size={36} style={{ color: 'var(--color-primary,#C5A454)' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>No startups yet</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>Track your first investment here.</p>
            <button onClick={onAdd} className="btn btn-primary"><Plus size={16} /> Add Investment</button>
            {children}
        </div>
    );
}

/* ─── Add Investment Modal ─── */
function AddInvestmentModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [form, setForm] = useState({
        name: '', sector: 'FinTech', stage: 'Seed', investmentDate: '',
        entryValuation: '', investedAmount: '', equityPercent: '', founderName: '', description: '',
    });

    const impliedEquity = form.investedAmount && form.entryValuation
        ? ((parseFloat(form.investedAmount) / parseFloat(form.entryValuation)) * 100).toFixed(2)
        : null;

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>Add New Investment</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Startup Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Corp" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Sector *</label>
                            <select className="select" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                                {SECTORS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Stage *</label>
                            <select className="select" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                                {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Investment Date *</label>
                        <input type="date" className="input" value={form.investmentDate} onChange={e => setForm({ ...form, investmentDate: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Entry Valuation (₹) *</label>
                            <input type="number" className="input" value={form.entryValuation} onChange={e => setForm({ ...form, entryValuation: e.target.value })} required min="0" step="any" placeholder="0" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Amount Invested (₹) *</label>
                            <input type="number" className="input" value={form.investedAmount} onChange={e => setForm({ ...form, investedAmount: e.target.value })} required min="0" step="any" placeholder="0" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Equity % *</label>
                            <input type="number" className="input" value={form.equityPercent} onChange={e => setForm({ ...form, equityPercent: e.target.value })} required min="0" max="100" step="0.01" placeholder="0.00" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Founder Name</label>
                            <input className="input" value={form.founderName} onChange={e => setForm({ ...form, founderName: e.target.value })} placeholder="Optional" />
                        </div>
                    </div>

                    {impliedEquity && (
                        <div style={{ background: 'rgba(197,164,84,.08)', border: '1px solid rgba(197,164,84,.2)', borderRadius: 9, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Implied equity at valuation</span>
                            <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono,monospace)', color: 'var(--color-primary,#C5A454)' }}>
                                {impliedEquity}%
                            </span>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Description</label>
                        <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this company do?" style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ flex: 1 }}>
                            {isLoading ? 'Adding…' : 'Add Investment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
