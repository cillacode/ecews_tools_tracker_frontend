import { api } from './client';

export const getMovements      = (params) => api.get('/movements', { params }).then((r) => r.data);
export const recordReceipt     = (body)   => api.post('/movements/receipt', body).then((r) => r.data);
export const recordAdjustment  = (body)   => api.post('/movements/adjustment', body).then((r) => r.data);
export const recordTransfer    = (body)   => api.post('/movements/transfer', body).then((r) => r.data);
export const recordBulkReceipt = (body)   => api.post('/movements/bulk-receipt', body).then((r) => r.data);

// Acknowledgement workflow
export const getIncoming        = ()        => api.get('/movements/incoming').then((r) => r.data);
export const getDisputes        = ()        => api.get('/movements/disputes').then((r) => r.data);
export const acknowledge        = (id, body) => api.post(`/movements/${id}/acknowledge`, body).then((r) => r.data);
export const applyDispute       = (id)      => api.post(`/movements/${id}/apply-dispute`).then((r) => r.data);
