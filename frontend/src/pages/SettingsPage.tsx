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
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: activeTab === tab.id ? 'var(--color-bg-hover)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
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
        <div className="card max-w-lg">
            <h3 className="font-display text-lg mb-4">Profile Information</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                    <input className="input" value={investor?.email || ''} disabled style={{ opacity: 0.5 }} />
                </div>
                <button onClick={() => mutation.mutate({ name })} className="btn btn-primary" disabled={mutation.isPending}>
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
        <div className="card max-w-lg">
            <h3 className="font-display text-lg mb-4">Change Password</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Current Password</label>
                    <input type="password" className="input" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>New Password</label>
                    <input type="password" className="input" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} required minLength={8} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Confirm New Password</label>
                    <input type="password" className="input" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
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

    if (isLoading) return <div className="card animate-shimmer h-48" />;

    const c = form || config;

    return (
        <div className="card max-w-lg">
            <h3 className="font-display text-lg mb-4">Risk Alert Thresholds</h3>
            <div className="space-y-4">
                {[
                    { key: 'runwayWarningMonths', label: 'Runway Warning (months)', min: 0 },
                    { key: 'runwayCriticalMonths', label: 'Runway Critical (months)', min: 0 },
                    { key: 'revenueDropWarningPct', label: 'Revenue Drop Warning (%)', min: 0 },
                    { key: 'updateOverdueDays', label: 'Update Overdue (days)', min: 1 },
                    { key: 'irrNegativeThresholdPct', label: 'IRR Negative Threshold (%)', min: -100 },
                    { key: 'moicWarningThreshold', label: 'MOIC Warning Threshold', min: 0, step: 0.01 },
                ].map(field => (
                    <div key={field.key}>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{field.label}</label>
                        <input
                            type="number"
                            className="input"
                            value={c?.[field.key] ?? ''}
                            min={field.min}
                            step={field.step || 1}
                            onChange={e => setForm({ ...c, [field.key]: parseFloat(e.target.value) })}
                        />
                    </div>
                ))}
                <button
                    onClick={() => mutation.mutate(form || config)}
                    className="btn btn-primary"
                    disabled={mutation.isPending}
                >
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
        <div className="card max-w-lg">
            <h3 className="font-display text-lg mb-2">Export Your Data</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Download all your portfolio data as a JSON file.</p>
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

    if (isLoading) return <div className="card animate-shimmer h-64" />;

    return (
        <div className="card" style={{ padding: 0 }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-display text-lg">Audit Log</h3>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                    <thead><tr><th>Action</th><th>Entity</th><th>Date</th></tr></thead>
                    <tbody>
                        {data?.logs?.map((log: any) => (
                            <tr key={log._id}>
                                <td><span className="badge badge-blue">{log.action.replace(/_/g, ' ')}</span></td>
                                <td className="text-xs">{log.entityType} ({log.entityId.slice(-6)})</td>
                                <td className="text-xs">{formatDate(log.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data?.pagination && (
                <div className="px-6 py-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Page {data.pagination.page} of {data.pagination.pages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary btn-sm"
                        >Previous</button>
                        <button
                            onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                            disabled={page >= data.pagination.pages}
                            className="btn btn-secondary btn-sm"
                        >Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
