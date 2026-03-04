import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, Download, Loader2, Building2, Briefcase, Table2, FileSpreadsheet } from 'lucide-react';
import { startupsAPI, reportsAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';

async function downloadBlob(blob: Blob, filename: string) {
    // If the blob is very small and likely contains a JSON error, try to parse it
    if (blob.size < 1000 && blob.type === 'application/json') {
        const text = await blob.text();
        try {
            const json = JSON.parse(text);
            if (json.success === false) {
                toast.error(json.error?.message || 'Download failed');
                return;
            }
        } catch { /* ignore */ }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function ReportsPage() {
    const [selectedStartup, setSelectedStartup] = useState('');

    const { data: startups } = useQuery({
        queryKey: ['startups'],
        queryFn: async () => {
            const res = await startupsAPI.getAll();
            return res.data.data;
        },
    });

    const portfolioMutation = useMutation({
        mutationFn: async () => {
            const res = await reportsAPI.portfolioPDF();
            return res.data;
        },
        onSuccess: (data: Blob) => {
            downloadBlob(data, `portfolio-report-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('Portfolio report downloaded');
        },
        onError: () => toast.error('Failed to generate portfolio report'),
    });

    const startupMutation = useMutation({
        mutationFn: async (startupId: string) => {
            const res = await reportsAPI.startupPDF(startupId);
            return res.data;
        },
        onSuccess: (data: Blob) => {
            const startup = startups?.find((s: any) => s._id === selectedStartup || s.id === selectedStartup);
            downloadBlob(data, `${startup?.name || 'startup'}-report-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('Startup report downloaded');
        },
        onError: () => toast.error('Failed to generate startup report'),
    });

    // CSV exports
    const [csvLoading, setCsvLoading] = useState<string | null>(null);
    const handlePortfolioCSV = async () => {
        setCsvLoading('portfolio');
        try {
            const res = await exportAPI.portfolioCSV();
            downloadBlob(res.data, `portfolio-${new Date().toISOString().split('T')[0]}.csv`);
            toast.success('Portfolio CSV downloaded');
        } catch { toast.error('CSV export failed'); }
        finally { setCsvLoading(null); }
    };
    const handleCashflowsCSV = async () => {
        setCsvLoading('cashflows');
        try {
            const res = await exportAPI.cashflowsCSV();
            downloadBlob(res.data, `cashflows-${new Date().toISOString().split('T')[0]}.csv`);
            toast.success('Cashflows CSV downloaded');
        } catch { toast.error('CSV export failed'); }
        finally { setCsvLoading(null); }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>Reports &amp; Exports</h1>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                    Generate PDF reports or download CSV exports for your portfolio
                </p>
            </div>

            {/* PDF Reports */}
            <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    PDF Reports
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Portfolio Report Card */}
                    <div className="card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(197,164,84,0.04)', border: '1px solid rgba(197,164,84,0.06)' }} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                            background: 'rgba(197,164,84,0.08)', border: '1px solid rgba(197,164,84,0.18)',
                        }}>
                            <Briefcase size={22} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                            Portfolio Report
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                            Complete portfolio overview including all investments, sector allocation, MOIC/IRR metrics, and performance table.
                        </p>
                        <button
                            onClick={() => portfolioMutation.mutate()}
                            disabled={portfolioMutation.isPending}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {portfolioMutation.isPending ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                            ) : (
                                <><Download size={16} /> Download Portfolio PDF</>
                            )}
                        </button>
                    </div>

                    {/* Startup Report Card */}
                    <div className="card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.06)' }} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)',
                        }}>
                            <Building2 size={22} style={{ color: '#60A5FA' }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                            Startup Report
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                            Detailed report for a single startup including investment summary, cashflows, monthly updates, and documents.
                        </p>
                        <select
                            className="input"
                            value={selectedStartup}
                            onChange={e => setSelectedStartup(e.target.value)}
                            style={{ marginBottom: 12, width: '100%' }}
                        >
                            <option value="">Select a startup...</option>
                            {startups?.map((s: any) => (
                                <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => selectedStartup && startupMutation.mutate(selectedStartup)}
                            disabled={!selectedStartup || startupMutation.isPending}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {startupMutation.isPending ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                            ) : (
                                <><Download size={16} /> Download Startup PDF</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* CSV Exports */}
            <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    CSV Exports
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    <div className="card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.06)' }} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)',
                        }}>
                            <Table2 size={22} style={{ color: '#34D399' }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                            Portfolio CSV
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                            All startups with computed metrics — open in Excel or Google Sheets for custom analysis.
                        </p>
                        <button onClick={handlePortfolioCSV} disabled={csvLoading === 'portfolio'} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {csvLoading === 'portfolio' ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                            ) : (
                                <><Download size={16} /> Download Portfolio CSV</>
                            )}
                        </button>
                    </div>

                    <div className="card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.06)' }} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)',
                        }}>
                            <FileSpreadsheet size={22} style={{ color: '#FBBF24' }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                            Cashflows CSV
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                            Full transaction ledger across all startups — every investment, follow-on, exit, and correction entry.
                        </p>
                        <button onClick={handleCashflowsCSV} disabled={csvLoading === 'cashflows'} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {csvLoading === 'cashflows' ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                            ) : (
                                <><Download size={16} /> Download Cashflows CSV</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Info card */}
            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: '3px solid var(--color-primary)' }}>
                <FileText size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        Reports are generated in real-time with the latest data. CSVs are ready for Excel, Google Sheets, or any analytics tool.
                    </p>
                </div>
            </div>
        </div>
    );
}
