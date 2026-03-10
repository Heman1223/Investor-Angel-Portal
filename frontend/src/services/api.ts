import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    timeout: 15000, // 15s timeout
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401 with silent refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRequest = originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/me');

        if (error.response?.status === 401 && !originalRequest._retry && !(originalRequest as any)._isRefresh && !isAuthRequest) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Use the api instance itself so it gets the correct baseURL
                // but pass a flag to avoid infinite loops if it 401s
                const { data } = await api.post('/auth/refresh', {}, { _isRefresh: true } as any);
                const newToken = data.data.accessToken;
                sessionStorage.setItem('accessToken', newToken);
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                sessionStorage.removeItem('accessToken');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// ========= API Functions =========

// Auth
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (name: string, email: string, password: string) =>
        api.post('/auth/register', { name, email, password }),
    registerCompanyLocal: (name: string, email: string, password: string) =>
        api.post('/auth/register/company-local', { name, email, password }),
    registerCompany: (name: string, email: string, password: string, inviteToken: string) =>
        api.post('/auth/register/company', { name, email, password, inviteToken }),
    getInvite: (token: string) => api.get(`/auth/invite/${token}`),
    logout: () => api.post('/auth/logout'),
    refresh: () => api.post('/auth/refresh'),
    me: () => api.get('/auth/me'),
    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', { email }),
    resetPassword: (email: string, token: string, newPassword: string) =>
        api.post('/auth/reset-password', { email, token, newPassword }),
};

// Dashboard
export const dashboardAPI = {
    get: () => api.get('/dashboard'),
};

// Startups
export const startupsAPI = {
    getAll: (status?: string) =>
        api.get('/startups', { params: status ? { status } : {} }),
    getById: (id: string) => api.get(`/startups/${id}`),
    create: (data: any) => api.post('/startups', data),
    update: (id: string, data: any) => api.put(`/startups/${id}`, data),
    delete: (id: string) => api.delete(`/startups/${id}`),
    recordExit: (id: string, data: any) =>
        api.post(`/startups/${id}/exit`, data),
    addFollowOn: (id: string, data: any) =>
        api.post(`/startups/${id}/follow-on`, data),
    updateValuation: (id: string, currentValuation: number) =>
        api.put(`/startups/${id}/valuation`, { currentValuation }),
    addNote: (id: string, text: string) =>
        api.post(`/startups/${id}/notes`, { text }),
};

// Monthly Updates
export const updatesAPI = {
    getForStartup: (startupId: string) =>
        api.get(`/startups/${startupId}/updates`),
    create: (startupId: string, data: any) =>
        api.post(`/startups/${startupId}/updates`, data),
    getAll: () => api.get('/settings/updates'),
    markSeen: (startupId: string, updateId: string) =>
        api.post(`/startups/${startupId}/updates/${updateId}/mark-seen`),
    getUnreadCount: () => api.get('/investor/updates/unread-count'),
};

// Cashflows
export const cashflowsAPI = {
    getForStartup: (startupId: string) =>
        api.get(`/startups/${startupId}/cashflows`),
    getAll: () => api.get('/cashflows'),
    add: (startupId: string, data: { amount: number; date: string; type: string; roundName?: string; notes?: string; reason?: string }) =>
        api.post(`/startups/${startupId}/cashflows`, data),
    update: (startupId: string, cfId: string, data: { amount?: number; date?: string; type?: string; roundName?: string; notes?: string; reason: string }) =>
        api.put(`/startups/${startupId}/cashflows/${cfId}`, data),
    delete: (startupId: string, cfId: string, reason: string) =>
        api.delete(`/startups/${startupId}/cashflows/${cfId}`, { data: { reason } }),
};

// Alerts
export const alertsAPI = {
    getAll: (isRead?: boolean) =>
        api.get('/alerts', { params: isRead !== undefined ? { isRead } : {} }),
    markRead: (id: string) => api.put(`/alerts/${id}/read`),
    markAllRead: () => api.put('/alerts/read-all'),
    getConfig: () => api.get('/alerts/config'),
    updateConfig: (data: any) => api.put('/alerts/config', data),
};

// Documents
export const documentsAPI = {
    getForStartup: (startupId: string) =>
        api.get(`/startups/${startupId}/documents`),
    getAll: () => api.get('/documents'),
    upload: (startupId: string, formData: FormData) =>
        api.post(`/startups/${startupId}/documents`, formData),
    uploadGeneral: (formData: FormData) =>
        api.post('/documents/upload', formData),
    download: (id: string) => api.get(`/documents/${id}/download`),
    downloadRawFile: (id: string) => api.get(`/documents/${id}/file`, { responseType: 'blob' }),
    delete: (id: string) => api.delete(`/documents/${id}`),
    update: (id: string, data: { fileName?: string; startupId?: string | null; documentType?: string }) =>
        api.put(`/documents/${id}`, data),
};

// Settings
export const settingsAPI = {
    get: () => api.get('/settings'),
    updateProfile: (data: any) => api.put('/settings/profile', data),
    changePassword: (data: any) => api.put('/settings/password', data),
    getAuditLog: (page: number, limit: number) =>
        api.get('/settings/audit-log', { params: { page, limit } }),
    exportData: () => api.get('/settings/export'),
};

// Reports
export const reportsAPI = {
    portfolioPDF: () => api.post('/reports/portfolio', {}, { responseType: 'blob' }),
    startupPDF: (startupId: string) => api.post(`/reports/startup/${startupId}`, {}, { responseType: 'blob' }),
};

// CSV Export
export const exportAPI = {
    portfolioCSV: () => api.get('/export/portfolio.csv', { responseType: 'blob' }),
    cashflowsCSV: (startupId?: string) =>
        api.get('/export/cashflows.csv', { params: startupId ? { startupId } : {}, responseType: 'blob' }),
};

export const companyAPI = {
    getDashboard: () => api.get('/company/me/startups'),
    getPendingInvites: () => api.get('/company/invites'),
    acceptInvite: (inviteId: string) => api.post(`/company/invites/${inviteId}/accept`),
    declineInvite: (inviteId: string) => api.post(`/company/invites/${inviteId}/decline`),
    getUpdates: () => api.get('/company/updates'),
    createUpdate: (data: any) => api.post('/company/updates', data),
    submitCorrection: (id: string, data: any) => api.put(`/company/updates/${id}/correction`, data),
};

// Invites
export const inviteAPI = {
    create: (startupId: string, email: string) => api.post(`/startups/${startupId}/company-invites`, { email }),
    getAll: (startupId: string) => api.get(`/startups/${startupId}/company-invites`),
    getMembers: (startupId: string) => api.get(`/startups/${startupId}/company-members`),
    resend: (startupId: string, inviteId: string) => api.post(`/startups/${startupId}/company-invites/${inviteId}/resend`),
    revoke: (startupId: string, inviteId: string) => api.post(`/startups/${startupId}/company-invites/${inviteId}/revoke`),
};

// Messaging
export const messagingAPI = {
    getConversations: (startupId: string) => api.get(`/messaging/${startupId}`),
    getMessages: (conversationId: string) => api.get(`/messaging/conversations/${conversationId}/messages`),
    sendMessage: (conversationId: string, content: string) => api.post(`/messaging/conversations/${conversationId}/messages`, { content }),
    markRead: (conversationId: string) => api.post(`/messaging/conversations/${conversationId}/read`),
    getUnreadCount: (startupId?: string) =>
        api.get(startupId ? `/startups/${startupId}/messages/unread-count` : `/messages/unread-count`),
    markSeenByStartup: (startupId: string) => api.post(`/startups/${startupId}/messages/mark-seen`),
    getConversationByStartup: (startupId: string) => api.get(`/startups/${startupId}/messages`), // Same as getConversations
};
