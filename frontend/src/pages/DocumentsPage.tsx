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

const DOC_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    sha: { bg: '#dcfce7', color: '#15803d' },
    term_sheet: { bg: '#dbeafe', color: '#1e40af' },
    cap_table: { bg: '#f3e8ff', color: '#7c3aed' },
    legal: { bg: '#fef3c7', color: '#b45309' },
    financial_statement: { bg: '#fee2e2', color: '#b91c1c' },
    other: { bg: '#f1f5f9', color: '#475569' },
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
        return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-16" />)}</div>;
    }

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{
                    background: 'var(--color-primary-50)',
                    border: '2px dashed var(--color-primary)',
                }}>
                    <FolderOpen size={36} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No documents uploaded yet
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Organise your investment agreements here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Documents</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {documents.length} document{documents.length !== 1 ? 's' : ''} across your portfolio
                    </p>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="w-full">
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
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                                                background: ext === 'pdf' ? '#fee2e2' : ext === 'docx' || ext === 'doc' ? '#dbeafe' : '#f1f5f9',
                                            }}>
                                                <span className="text-[10px] font-bold" style={{
                                                    color: ext === 'pdf' ? '#ef4444' : ext === 'docx' || ext === 'doc' ? '#3b82f6' : '#64748b',
                                                }}>
                                                    {ext.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                {doc.fileName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-sm" style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>
                                        {doc.startupId?.name || '—'}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span className="badge" style={{
                                            background: typeStyle.bg,
                                            color: typeStyle.color,
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                        }}>
                                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                                        </span>
                                    </td>
                                    <td className="text-xs" style={{ padding: '14px 20px', color: 'var(--color-text-muted)' }}>
                                        {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                                    </td>
                                    <td className="text-xs" style={{ padding: '14px 20px', color: 'var(--color-text-muted)' }}>
                                        {formatDate(doc.uploadedAt)}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div className="flex gap-1">
                                            <button className="p-1.5 rounded-lg hover:bg-gray-100" style={{ color: 'var(--color-text-muted)' }}>
                                                <Download size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc._id); }}
                                                className="p-1.5 rounded-lg hover:bg-red-50"
                                                style={{ color: 'var(--color-text-muted)' }}
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
