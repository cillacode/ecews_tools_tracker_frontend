import { api } from './client';

export const getThresholds    = ()          => api.get('/thresholds').then((r) => r.data);
export const getLowStock      = ()          => api.get('/dashboard/low-stock').then((r) => r.data);
export const createThreshold  = (body)      => api.post('/thresholds', body).then((r) => r.data);
export const deleteThreshold  = (id)        => api.delete(`/thresholds/${id}`).then((r) => r.data);
