import { api } from './client';

export const getKpis           = ()  => api.get('/dashboard/kpis').then((r) => r.data);
export const getRecentActivity = ()  => api.get('/dashboard/recent').then((r) => r.data);
export const getCoverage       = ()  => api.get('/dashboard/coverage').then((r) => r.data);

// Facility-user-scoped dashboard endpoints
export const getFacilityKpis         = () => api.get('/dashboard/facility-kpis').then((r) => r.data);
export const getFacilityRecent       = () => api.get('/dashboard/facility-recent').then((r) => r.data);
export const getFacilityStockSummary = () => api.get('/dashboard/facility-stock-summary').then((r) => r.data);

// DSO (LGA-scoped) dashboard endpoints
export const getLgaKpis        = () => api.get('/dashboard/lga-kpis').then((r) => r.data);
export const getLgaRecent      = () => api.get('/dashboard/lga-recent').then((r) => r.data);
export const getLgaFacilities  = () => api.get('/dashboard/lga-facilities').then((r) => r.data);

// HQ (super_admin) drill-down dashboard
export const getHqKpis         = ()       => api.get('/dashboard/hq-kpis').then((r) => r.data);
export const getHqCoverage     = (params) => api.get('/dashboard/hq-coverage', { params }).then((r) => r.data);

// Facilities holding at least one low-stock tool (qty ≤ 10), with the low
// tools nested per facility.
export const getLowStockFacilities = () => api.get('/dashboard/low-stock-facilities').then((r) => r.data);
