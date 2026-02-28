import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Download, FolderOpen } from 'lucide-react';
import { documentsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

const DOC_TYPE_LABELS: Record<string, string> = {
    sha: 'SHA',
    term_sheet: 'Term Sheet',
    cap_table: 'Cap Table',
    legal: 'Legal',
    financial_statement: 'Financial',
    other: 'Other',
};

const DOC_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    sha: { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
    term_sheet: { bg: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'rgba(96,165,250,0.2)' },
    cap_table: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.2)' },
    legal: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
    financial_statement: { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.2)' },
    other: { bg: 'rgba(255,255,255,0.05)', color: '#7A8098', border: 'rgba(255,255,255,0.1)' },
};

export default function DocumentsPage() {
    const queryClient = useQueryClient();

    const { data: documents, isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: async () => {
            const res = await documentsAPI.getAll();
            return res.data.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => documentsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Document archived');
        },
    });

    if (isLoading) {
        return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3].map(i => <div key={i} className="card animate-shimmer" style={{ height: 64 }} />)}</div>;
    }

    if (!documents || documents.length === 0) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                    background: 'rgba(197,164,84,0.06)', border: '2px dashed rgba(197,164,84,0.3)',
                }}>
                    <FolderOpen size={36} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)', fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>
                    No documents uploaded yet
                </h2>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Organise your investment agreements here.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>Documents</h1>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                        {documents.length} document{documents.length !== 1 ? 's' : ''} across your portfolio
                    </p>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '12px 20px' }}>File Name</th>
                            <th style={{ padding: '12px 20px' }}>Startup</th>
                            <th style={{ padding: '12px 20px' }}>Type</th>
                            <th style={{ padding: '12px 20px' }}>Size</th>
                            <th style={{ padding: '12px 20px' }}>Uploaded</th>
                            <th style={{ padding: '12px 20px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc: any) => {
                            const ext = doc.fileName.split('.').pop()?.toLowerCase() || '';
                            const typeStyle = DOC_TYPE_COLORS[doc.documentType] || DOC_TYPE_COLORS.other;
                            return (
                                <tr key={doc._id}>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                background: ext === 'pdf' ? 'rgba(248,113,113,0.1)' : ext === 'docx' || ext === 'doc' ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${ext === 'pdf' ? 'rgba(248,113,113,0.2)' : ext === 'docx' || ext === 'doc' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.1)'}`,
                                            }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
                                                    color: ext === 'pdf' ? '#F87171' : ext === 'docx' || ext === 'doc' ? '#60A5FA' : '#7A8098',
                                                }}>
                                                    {ext.toUpperCase()}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                                {doc.fileName}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                                        {doc.startupId?.name || '—'}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span className="badge" style={{
                                            background: typeStyle.bg,
                                            color: typeStyle.color,
                                            border: `1px solid ${typeStyle.border}`,
                                            fontSize: 11,
                                            padding: '2px 8px',
                                        }}>
                                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                                        {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                                        {formatDate(doc.uploadedAt)}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}>
                                                <Download size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc._id); }}
                                                style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
