import { api } from './client';

export const getFacilities    = (params) => api.get('/facilities', { params }).then((r) => r.data);
export const getFacility      = (id)     => api.get(`/facilities/${id}`).then((r) => r.data);
export const getFacilityStock = (id)     => api.get(`/facilities/${id}/stock`).then((r) => r.data);
export const createFacility   = (body)   => api.post('/facilities', body).then((r) => r.data);
export const getLgas          = ()       => api.get('/lgas').then((r) => r.data);
