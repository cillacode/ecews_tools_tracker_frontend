import { api } from './client';

export const getTools           = (params) => api.get('/tools', { params }).then((r) => r.data);
export const getTool            = (id)     => api.get(`/tools/${id}`).then((r) => r.data);
export const getToolDistribution = (id)    => api.get(`/tools/${id}/distribution`).then((r) => r.data);
export const createTool        = (body)   => api.post('/tools', body).then((r) => r.data);
export const updateTool        = (id, body) => api.patch(`/tools/${id}`, body).then((r) => r.data);
export const getThematicAreas  = ()       => api.get('/thematic-areas').then((r) => r.data);
