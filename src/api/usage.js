import { api } from './client';

// Record one day's usage entries. Body: { usage_date, entries: [...], facility_id? }
export const submitDailyUsage   = (body)         => api.post('/usage', body).then((r) => r.data);

// One row per tool with the SUM across the week.
export const getWeekUsage       = (date, params) => api.get(`/usage/week/${date}`, { params }).then((r) => r.data);

// Per-day audit detail for a specific day.
export const getDayUsage        = (date, params) => api.get(`/usage/day/${date}`,  { params }).then((r) => r.data);

// Per-tool tracker (Beginning / Supplied / Utilized / Adj± / Ending) for one week.
export const getUsageTracker    = (params)       => api.get('/usage/tracker', { params }).then((r) => r.data);

// Flat list with filters — used for admin/DSO browsing.
export const listUsage          = (params)       => api.get('/usage', { params }).then((r) => r.data);
