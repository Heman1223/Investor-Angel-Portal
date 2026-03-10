import { QueryClient } from '@tanstack/react-query';

export function invalidateInvestmentQueries(queryClient: QueryClient, id?: string) {
    queryClient.invalidateQueries({ queryKey: ['startups'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['cashflows'] });
    queryClient.invalidateQueries({ queryKey: ['updates'] });
    if (id) {
        queryClient.invalidateQueries({ queryKey: ['startup', id] });
        queryClient.invalidateQueries({ queryKey: ['updates', id] });
        queryClient.invalidateQueries({ queryKey: ['startup-documents', id] });
        queryClient.invalidateQueries({ queryKey: ['startup-invites', id] });
        queryClient.invalidateQueries({ queryKey: ['startup-members', id] });
    }
}
