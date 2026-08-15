import { api } from './client';

export const getFacilities    = (params) => api.get('/facilities', { params }).then((r) => r.data);
export const getFacility      = (id)     => api.get(`/facilities/${id}`).then((r) => r.data);
export const getFacilityStock = (id)     => api.get(`/facilities/${id}/stock`).then((r) => r.data);
export const createFacility   = (body)   => api.post('/facilities', body).then((r) => r.data);
export const getLgas          = (params) => api.get('/lgas', { params }).then((r) => r.data);
export const getStates        = ()       => api.get('/states').then((r) => r.data);
export const getStatesSummary = ()       => api.get('/states/summary').then((r) => r.data);
