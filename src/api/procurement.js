import { api } from './client';

export const getLowTools = (params) =>
  api.get('/procurement/low-tools', { params }).then((r) => r.data);

// Downloads the printable procurement-request PDF (grouped by thematic area).
export const downloadProcurementPdf = async (params) => {
  const response = await api.get('/procurement/low-tools/pdf', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `procurement-request-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
