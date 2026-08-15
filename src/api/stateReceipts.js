import { api } from './client';

// State admin's acknowledgement of HQ receipts.
export const getStateIncoming   = ()        => api.get('/state-movements/incoming').then((r) => r.data);
export const getStateHistory    = ()        => api.get('/state-movements/history').then((r) => r.data);
export const acknowledgeReceipt = (id, body) => api.post(`/state-movements/${id}/acknowledge`, body).then((r) => r.data);
