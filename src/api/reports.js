import { api } from './client';

// Each function triggers a file download by fetching as a blob and using a
// temporary anchor element — no new tab, no CORS issues.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchExcel(path, params, filename) {
  const response = await api.get(path, { params, responseType: 'blob' });
  downloadBlob(response.data, filename);
}

const today = () => new Date().toISOString().slice(0, 10);

export const downloadMovements     = (params) => fetchExcel('/reports/movements',      params, `movements-${today()}.xlsx`);
export const downloadFacilityStock = (params) => fetchExcel('/reports/facility-stock', params, `facility-stock-${today()}.xlsx`);
export const downloadCoveragePivot = ()       => fetchExcel('/reports/coverage-pivot', {},     `coverage-pivot-${today()}.xlsx`);
export const downloadUsage         = (params) => fetchExcel('/reports/usage',          params, `tool-usage-${today()}.xlsx`);
export const downloadTemplate      = ()       => api.get('/import/template', { responseType: 'blob' }).then((r) => downloadBlob(r.data, 'import-template.csv'));
export const downloadStateTemplate = ()       => api.get('/import/state-template', { responseType: 'blob' }).then((r) => downloadBlob(r.data, 'state-import-template.csv'));

// Delivery-note PDFs. (API path unchanged — only the user-facing name moved
// from "gate pass" to "Delivery Note".)
export const downloadFacilityGatePass = (body) =>
  api.post('/gate-pass/facility', body, { responseType: 'blob' })
    .then((r) => downloadBlob(r.data, `delivery-note-${today()}.pdf`));
export const downloadBatchGatePass = (batchNo) =>
  api.get(`/gate-pass/batch/${encodeURIComponent(batchNo)}`, { responseType: 'blob' })
    .then((r) => downloadBlob(r.data, `delivery-notes-${batchNo}.pdf`));
// Combined delivery note for a bulk distribution — one page per facility.
export const downloadFacilitiesGatePass = (body) =>
  api.post('/gate-pass/facilities', body, { responseType: 'blob' })
    .then((r) => downloadBlob(r.data, `delivery-notes-${today()}.pdf`));
