import { api } from './client';

// Role-scoped counts for the sidebar badges: { incoming, low_tools }.
export const getNotificationSummary = () => api.get('/notifications/summary').then((r) => r.data);
