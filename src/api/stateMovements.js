import { api } from './client';

export const recordStateReceipt     = (body)   => api.post('/state-movements/receipt', body).then((r) => r.data);
export const recordStateBulkReceipt = (body)   => api.post('/state-movements/bulk-receipt', body).then((r) => r.data);
export const getStateMovements      = (params) => api.get('/state-movements', { params }).then((r) => r.data);
export const getStateCoverage       = ()       => api.get('/state-movements/coverage').then((r) => r.data);
// The state's own tool ledger: received / distributed / balance left per tool.
export const getStateStock          = ()       => api.get('/state-movements/stock').then((r) => r.data);
