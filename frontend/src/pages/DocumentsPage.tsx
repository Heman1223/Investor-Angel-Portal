import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Download, FolderOpen, Search, AlertTriangle, X } from 'lucide-react';
import { documentsAPI, startupsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { UploadCloud } from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
    sha: 'SHA',
    term_sheet: 'Term Sheet',
    cap_table: 'Cap Table',
    legal: 'Legal',
    financial_statement: 'Financial',
    boardResolution: 'Board Resolution',
    legalAgreement: 'Legal Agreement',
    other: 'Other',
};

const DOC_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    sha: { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
    term_sheet: { bg: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'rgba(96,165,250,0.2)' },
    cap_table: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.2)' },
    legal: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
    financial_statement: { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.2)' },
    boardResolution: { bg: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: 'rgba(34,211,238,0.2)' },
    legalAgreement: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
    other: { bg: 'rgba(255,255,255,0.05)', color: '#7A8098', border: 'rgba(255,255,255,0.1)' },
};

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadData, setUploadData] = useState({ startupId: '', documentType: 'other', file: null as File | null });

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
            setDeleteTarget(null);
        },
    });

    const { data: startups } = useQuery({
        queryKey: ['startups-list'],
        queryFn: async () => {
            const res = await startupsAPI.getAll('active');
            return res.data.data;
        },
        enabled: showUploadModal,
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadData.startupId || !uploadData.file) throw new Error('Missing fields');
            const formData = new FormData();
            formData.append('document', uploadData.file);
            formData.append('documentType', uploadData.documentType);
            return documentsAPI.upload(uploadData.startupId, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Document uploaded successfully');
            setShowUploadModal(false);
            setUploadData({ startupId: '', documentType: 'other', file: null });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to upload document');
        },
    });

    const filteredDocs = (documents || []).filter((doc: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            doc.fileName.toLowerCase().includes(q) ||
            (doc.startupId?.name || '').toLowerCase().includes(q) ||
            (DOC_TYPE_LABELS[doc.documentType] || doc.documentType).toLowerCase().includes(q)
        );
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
                        {filteredDocs.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}{search ? ' matching search' : ''}
                    </p>
                </div>
                <button title="Upload a new document" className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UploadCloud size={16} /> Upload Document
                </button>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                    type="text"
                    className="input"
                    placeholder="Search by file name, startup, or type..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {filteredDocs.length === 0 ? (
                <div className="card text-center" style={{ padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                    <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p>No documents match "{search}"</p>
                </div>
            ) : (
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
                            {filteredDocs.map((doc: any) => {
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
                                                <button title="Download document" style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}>
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    title="Delete document"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: doc._id, name: doc.fileName }); }}
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
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                            }}>
                                <AlertTriangle size={20} style={{ color: 'var(--color-red)' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Delete Document</h3>
                                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>This action cannot be undone</p>
                            </div>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.name}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>Upload Document</h2>
                            <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Startup</label>
                                <select
                                    className="input"
                                    value={uploadData.startupId}
                                    onChange={e => setUploadData({ ...uploadData, startupId: e.target.value })}
                                >
                                    <option value="">Select a startup...</option>
                                    {startups?.map((s: any) => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Document Type</label>
                                <select
                                    className="input"
                                    value={uploadData.documentType}
                                    onChange={e => setUploadData({ ...uploadData, documentType: e.target.value })}
                                >
                                    {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">File</label>
                                <input
                                    type="file"
                                    className="input"
                                    onChange={e => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                                    style={{ padding: '8px 12px' }}
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: 8 }}
                                onClick={() => uploadMutation.mutate()}
                                disabled={uploadMutation.isPending || !uploadData.startupId || !uploadData.file}
                            >
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
