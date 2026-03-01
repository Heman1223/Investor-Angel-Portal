import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized cache invalidation for any investment-related mutation.
 * Call this after exit, follow-on, update, edit, write-off, etc.
 * Ensures Portfolio, Dashboard, Alerts, and Sidebar all stay fresh.
 */
export function invalidateInvestmentQueries(
    queryClient: QueryClient,
    startupId?: string,
) {
    // Per-startup caches
    if (startupId) {
        queryClient.invalidateQueries({ queryKey: ['startup', startupId] });
        queryClient.invalidateQueries({ queryKey: ['updates', startupId] });
        queryClient.invalidateQueries({ queryKey: ['startupDocuments', startupId] });
    }

    // List & aggregate caches
    queryClient.invalidateQueries({ queryKey: ['startups'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    // All alert-related caches (AlertsPage, DashboardPage, Sidebar)
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
    queryClient.invalidateQueries({ queryKey: ['alerts', 'unread'] });
}
