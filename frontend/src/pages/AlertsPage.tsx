import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, AlertTriangle } from 'lucide-react';
import { alertsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function AlertsPage() {
    const queryClient = useQueryClient();

    const { data: alerts, isLoading } = useQuery({
        queryKey: ['alerts'],
        queryFn: async () => {
            const res = await alertsAPI.getAll();
            return res.data.data;
        },
    });

    const markReadMutation = useMutation({
        mutationFn: (id: string) => alertsAPI.markRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: () => alertsAPI.markAllRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
            toast.success('All alerts marked as read');
        },
    });

    const unreadCount = alerts?.filter((a: any) => !a.isRead).length || 0;

    if (isLoading) {
        return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card animate-shimmer" style={{ height: 64 }} />)}</div>;
    }

    if (!alerts || alerts.length === 0) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <Check size={36} style={{ color: 'var(--color-green)' }} />
                </div>
                <h2 className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>All clear</h2>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No risk flags in your portfolio.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>Alerts</h1>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                        {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'No unread alerts'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={() => markAllMutation.mutate()} className="btn btn-secondary btn-sm">
                        <CheckCheck size={14} /> Mark All Read
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alerts.map((alert: any) => (
                    <div
                        key={alert._id}
                        className="card"
                        style={{
                            display: 'flex', alignItems: 'flex-start', gap: 16,
                            borderLeft: `3px solid ${alert.severity === 'RED' ? 'var(--color-red)' : 'var(--color-yellow)'}`,
                            opacity: alert.isRead ? 0.5 : 1,
                        }}
                    >
                        <div
                            style={{
                                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                                background: alert.severity === 'RED' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                                border: `1px solid ${alert.severity === 'RED' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                            }}
                        >
                            <AlertTriangle size={16} style={{ color: alert.severity === 'RED' ? 'var(--color-red)' : 'var(--color-yellow)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span className={`badge ${alert.severity === 'RED' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                                    {alert.severity}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    {alert.alertType.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{alert.message}</p>
                            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-muted)' }}>{formatDate(alert.triggeredAt)}</p>
                        </div>
                        {!alert.isRead && (
                            <button
                                onClick={() => markReadMutation.mutate(alert._id)}
                                className="btn btn-secondary btn-sm"
                                style={{ flexShrink: 0 }}
                            >
                                <Check size={14} /> Read
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
