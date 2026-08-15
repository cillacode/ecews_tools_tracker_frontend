import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { downloadTemplate, downloadStateTemplate, downloadBatchGatePass } from '../api/reports';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

// Role-specific import configuration. super_admin imports HQ→state
// distributions; state admins import facility opening balances.
const IMPORT_CONFIGS = {
  super_admin: {
    subtitle:     'Upload a CSV to record tools sent from HQ to states in bulk. All rows are validated before any record is created.',
    templateFn:   downloadStateTemplate,
    endpoint:     '/import/state-distributions',
    columns:      'state_name, tool_name, quantity, reference_no, note',
    fields: [
      ['state_name', 'must match exactly (e.g. "Lagos")'],
      ['tool_name',  'must match exactly (e.g. "ART register")'],
      ['quantity',   'positive whole number'],
      ['reference_no', 'optional'],
      ['note',       'optional'],
    ],
    invalidate:   [['hq-kpis'], ['hq-coverage'], ['state-movements'], ['state-coverage']],
  },
  admin: {
    subtitle:     'Upload a CSV to record opening balances across many facilities at once. All rows are validated before any record is created.',
    templateFn:   downloadTemplate,
    endpoint:     '/import/opening-balances',
    columns:      'facility_name, tool_name, quantity, reference_no, note',
    fields: [
      ['facility_name', 'must match exactly (e.g. "Sango PHC")'],
      ['tool_name',     'must match exactly (e.g. "ART register")'],
      ['quantity',      'positive whole number'],
      ['reference_no',  'optional'],
      ['note',          'optional'],
    ],
    invalidate:   [['dashboard-kpis'], ['dashboard-coverage'], ['facility-stock']],
  },
};

export default function Import() {
  const qc       = useQueryClient();
  const { user } = useAuth();
  const cfg      = IMPORT_CONFIGS[user?.role === 'super_admin' ? 'super_admin' : 'admin'];
  const fileRef  = useRef(null);
  const [file,     setFile]     = useState(null);
  const [result,   setResult]   = useState(null); // { imported, total, errors }
  const [loading,  setLoading]  = useState(false);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith('.csv')) { setFile(f); setResult(null); }
    else toast.error('Please drop a .csv file');
  }

  async function handleSubmit() {
    if (!file) { toast.error('Please select a CSV file first'); return; }
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post(cfg.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ type: 'success', imported: data.imported, total: data.total, batch_no: data.batch_no });
      toast.success(data.message);
      cfg.invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        setResult({ type: 'error', errors: errData.errors, total: errData.total, invalid: errData.invalid });
      } else {
        toast.error(errData?.error ?? 'Import failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bulk import"
        subtitle={cfg.subtitle}
      />

      <div className="max-w-2xl space-y-4">

        {/* Step 1 — Download template */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Step 1 — Download the template</CardTitle>
              <CardDescription>Fill in this CSV with your opening balance data.</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <div className="mb-4 overflow-x-auto rounded-lg border border-line bg-stone-50 p-3 font-mono text-xs text-muted">
              {cfg.columns}
            </div>
            <ul className="mb-4 space-y-1 text-sm text-muted">
              {cfg.fields.map(([name, desc]) => (
                <li key={name}><span className="font-medium text-ink">{name}</span> — {desc}</li>
              ))}
            </ul>
            <Button variant="secondary" leftIcon={<Download size={15} />} onClick={cfg.templateFn}>
              Download template (.csv)
            </Button>
          </CardBody>
        </Card>

        {/* Step 2 — Upload */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Step 2 — Upload your filled CSV</CardTitle>
              <CardDescription>All rows are validated first. If any row has an error, nothing is imported.</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-stone-50/60 px-6 py-10 transition-colors hover:border-brand-700 hover:bg-brand-50/30"
            >
              <Upload size={28} className="text-muted" />
              {file ? (
                <div className="text-center">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <FileText size={14} className="text-brand-700" />
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">Drop your CSV here or click to browse</p>
                  <p className="mt-1 text-xs text-muted">Maximum file size: 5 MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} className="sr-only" />
            </div>

            <div className="flex justify-end">
              <Button loading={loading} leftIcon={<Upload size={15} />} onClick={handleSubmit} disabled={!file}>
                Import data
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardBody>
              {result.type === 'success' ? (
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="mt-0.5 shrink-0 text-brand-700" />
                  <div className="flex-1">
                    <p className="font-medium text-ink">Import successful</p>
                    <p className="mt-1 text-sm text-muted">
                      Imported <span className="font-semibold text-ink num">{result.imported}</span> of{' '}
                      <span className="num">{result.total}</span> rows as stock receipts.
                    </p>
                    {result.batch_no && (
                      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-stone-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-ink">
                          Batch <span className="font-mono font-semibold">{result.batch_no}</span> — print delivery notes for the receiving facilities to sign at the gate.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Download size={14} />}
                          onClick={() => downloadBatchGatePass(result.batch_no).catch(() => toast.error('Failed to generate delivery notes'))}
                        >
                          Print delivery notes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-start gap-3">
                    <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-medium text-ink">Validation failed — nothing was imported</p>
                      <p className="mt-1 text-sm text-muted">
                        Fix the <span className="font-semibold text-red-600 num">{result.invalid}</span> error{result.invalid !== 1 ? 's' : ''} below and re-upload.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-red-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-red-100 bg-red-50 text-left">
                          <th className="px-4 py-2 font-medium text-muted">Row</th>
                          <th className="px-4 py-2 font-medium text-muted">Field</th>
                          <th className="px-4 py-2 font-medium text-muted">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {result.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 num text-muted">{e.row}</td>
                            <td className="px-4 py-2 font-mono text-xs text-ink">{e.field}</td>
                            <td className="px-4 py-2 text-red-700">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
