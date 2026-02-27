import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Trash2 } from 'lucide-react';
import { documentsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { useState } from 'react';

const DOC_TYPE_LABELS: Record<string, string> = {
    sha: 'SHA',
    term_sheet: 'Term Sheet',
    cap_table: 'Cap Table',
    legal: 'Legal',
    financial_statement: 'Financial',
    other: 'Other',
};

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [showUploadModal, setShowUploadModal] = useState(false);
    console.log(showUploadModal); // Temp fix or just remove if not needed.

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
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(201, 168, 76, 0.1)' }}>
                    <FileText size={36} style={{ color: 'var(--color-gold)' }} />
                </div>
                <h2 className="font-display text-2xl mb-2">No documents uploaded yet</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Organise your investment agreements here.</p>
                <button onClick={() => setShowUploadModal(true)} className="btn btn-primary"><Upload size={16} /> Upload Document</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-primary)' }}>Documents</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container" style={{ border: 'none', borderRadius: '14px' }}>
                    <table>
                        <thead>
                            <tr><th>File Name</th><th>Startup</th><th>Type</th><th>Size</th><th>Uploaded</th><th></th></tr>
                        </thead>
                        <tbody>
                            {documents.map((doc: any) => (
                                <tr key={doc._id}>
                                    <td className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} style={{ color: 'var(--color-gold)' }} />
                                            {doc.fileName}
                                        </div>
                                    </td>
                                    <td>{doc.startupId?.name || '—'}</td>
                                    <td><span className="badge badge-blue">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</span></td>
                                    <td className="text-xs">{(doc.fileSizeBytes / 1024).toFixed(0)} KB</td>
                                    <td className="text-xs">{formatDate(doc.uploadedAt)}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc._id); }}
                                                className="p-1.5 rounded hover:bg-[var(--color-bg-hover)]"
                                                style={{ color: 'var(--color-text-muted)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
