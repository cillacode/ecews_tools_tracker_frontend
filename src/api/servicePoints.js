import { api } from './client';

// Active service delivery points for the usage-entry dropdown.
export const getServicePoints = () => api.get('/service-points').then((r) => r.data);
