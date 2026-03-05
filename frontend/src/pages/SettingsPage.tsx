import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Bell, Download, FileText } from 'lucide-react';
import { settingsAPI, alertsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'alerts', label: 'Risk Config', icon: Bell },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'audit', label: 'Audit Log', icon: FileText },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)" }}>Settings</h1>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: 4, padding: 4, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,168,67,0.1)',
                overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                            borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                            fontFamily: "var(--font-body, 'Inter', sans-serif)",
                            background: activeTab === tab.id ? 'rgba(212,168,67,0.12)' : 'transparent',
                            color: activeTab === tab.id ? '#d4a843' : 'var(--color-text-muted)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'alerts' && <AlertConfigTab />}
            {activeTab === 'export' && <ExportTab />}
            {activeTab === 'audit' && <AuditLogTab />}
        </div>
    );
}

function ProfileTab() {
    const { investor } = useAuth();
    const [name, setName] = useState(investor?.name || '');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: any) => settingsAPI.updateProfile(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auth'] }); toast.success('Profile updated'); },
        onError: () => toast.error('Failed to update profile'),
    });

    return (
        <div className="card" style={{ maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Email</label>
                    <input className="input" value={investor?.email || ''} disabled />
                </div>
                <button onClick={() => mutation.mutate({ name })} className="btn btn-primary" disabled={mutation.isPending} style={{ alignSelf: 'flex-start' }}>
                    {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

function SecurityTab() {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

    const mutation = useMutation({
        mutationFn: (data: any) => settingsAPI.changePassword(data),
        onSuccess: () => { toast.success('Password changed successfully'); setForm({ currentPassword: '', newPassword: '', confirm: '' }); },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to change password'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
        mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    };

    return (
        <div className="card" style={{ maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>Change Password</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Current Password</label>
                    <input type="password" className="input" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} required />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>New Password</label>
                    <input type="password" className="input" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} required minLength={8} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Confirm New Password</label>
                    <input type="password" className="input" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ alignSelf: 'flex-start' }}>
                    {mutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
            </form>
        </div>
    );
}

function AlertConfigTab() {
    const queryClient = useQueryClient();
    const { data: config, isLoading } = useQuery({
        queryKey: ['alertConfig'],
        queryFn: async () => { const res = await alertsAPI.getConfig(); return res.data.data; },
    });

    const [form, setForm] = useState<any>(null);

    const mutation = useMutation({
        mutationFn: (data: any) => alertsAPI.updateConfig(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alertConfig'] }); toast.success('Alert configuration updated'); },
    });

    if (isLoading) return <div className="card animate-shimmer" style={{ height: 192 }} />;

    const c = form || config;

    return (
        <div className="card" style={{ maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>Risk Alert Thresholds</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                    { key: 'runwayWarningMonths', label: 'Runway Warning (months)', min: 0 },
                    { key: 'runwayCriticalMonths', label: 'Runway Critical (months)', min: 0 },
                    { key: 'revenueDropWarningPct', label: 'Revenue Drop Warning (%)', min: 0 },
                    { key: 'updateOverdueDays', label: 'Update Overdue (days)', min: 1 },
                    { key: 'irrNegativeThresholdPct', label: 'IRR Negative Threshold (%)', min: -100 },
                    { key: 'moicWarningThreshold', label: 'MOIC Warning Threshold', min: 0, step: 0.01 },
                ].map(field => (
                    <div key={field.key}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>{field.label}</label>
                        <input
                            type="number" className="input"
                            value={c?.[field.key] ?? ''}
                            min={field.min} step={field.step || 1}
                            onChange={e => setForm({ ...c, [field.key]: parseFloat(e.target.value) })}
                        />
                    </div>
                ))}
                <button onClick={() => mutation.mutate(form || config)} className="btn btn-primary" disabled={mutation.isPending} style={{ alignSelf: 'flex-start' }}>
                    {mutation.isPending ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}

function ExportTab() {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await settingsAPI.exportData();
            const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolioos-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Data exported successfully');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>Export Your Data</h3>
            <p style={{ fontSize: 14, marginBottom: 20, color: 'var(--color-text-secondary)' }}>Download all your portfolio data as a JSON file.</p>
            <button onClick={handleExport} className="btn btn-primary" disabled={exporting}>
                <Download size={16} /> {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
        </div>
    );
}

function AuditLogTab() {
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['auditLog', page],
        queryFn: async () => { const res = await settingsAPI.getAuditLog(page, 20); return res.data.data; },
    });

    if (isLoading) return <div className="card animate-shimmer" style={{ height: 256 }} />;

    return (
        <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Audit Log</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 500 }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px 20px' }}>Action</th>
                            <th style={{ padding: '10px 20px' }}>Entity</th>
                            <th style={{ padding: '10px 20px' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.logs?.map((log: any) => (
                            <tr key={log.id}>
                                <td style={{ padding: '12px 20px' }}>
                                    <span className="badge badge-blue" style={{ fontSize: 11, padding: '2px 8px' }}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                    {log.entityType} ({log.entityId.slice(-6)})
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                                    {formatDate(log.createdAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data?.pagination && (
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-light)' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Page {data.pagination.page} of {data.pagination.pages}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">Previous</button>
                        <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page >= data.pagination.pages} className="btn btn-secondary btn-sm">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
