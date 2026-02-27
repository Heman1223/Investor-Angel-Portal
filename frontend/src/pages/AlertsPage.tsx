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
        return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card animate-shimmer h-16" />)}</div>;
    }

    if (!alerts || alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <Check size={36} style={{ color: 'var(--color-green)' }} />
                </div>
                <h2 className="font-display text-2xl mb-2">All clear</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No risk flags in your portfolio.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-primary)' }}>Alerts</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'No unread alerts'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={() => markAllMutation.mutate()} className="btn btn-secondary btn-sm">
                        <CheckCheck size={14} /> Mark All Read
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {alerts.map((alert: any) => (
                    <div
                        key={alert._id}
                        className="card flex items-start gap-4"
                        style={{
                            borderLeft: `3px solid ${alert.severity === 'RED' ? 'var(--color-red)' : 'var(--color-yellow)'}`,
                            opacity: alert.isRead ? 0.6 : 1,
                        }}
                    >
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                                background: alert.severity === 'RED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            }}
                        >
                            <AlertTriangle size={16} style={{ color: alert.severity === 'RED' ? 'var(--color-red)' : 'var(--color-yellow)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`badge ${alert.severity === 'RED' ? 'badge-red' : 'badge-yellow'}`}>
                                    {alert.severity}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    {alert.alertType.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{alert.message}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{formatDate(alert.triggeredAt)}</p>
                        </div>
                        {!alert.isRead && (
                            <button
                                onClick={() => markReadMutation.mutate(alert._id)}
                                className="btn btn-secondary btn-sm flex-shrink-0"
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
