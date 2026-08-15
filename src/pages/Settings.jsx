import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

const getResetPreview = ()    => api.get('/admin/reset/preview').then((r) => r.data);
const postReset       = (body) => api.post('/admin/reset', body).then((r) => r.data);

export default function Settings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isSuper  = user?.role === 'super_admin';
  const [modalOpen,     setModalOpen]     = useState(false);
  const [confirmation,  setConfirmation]  = useState('');
  const [password,      setPassword]      = useState('');

  // Only fetch the preview when the modal is open — keeps the page light.
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey:  ['reset-preview'],
    queryFn:   getResetPreview,
    enabled:   modalOpen,
    staleTime: 0,
  });
  const preview = previewData?.data ?? {};

  const mutation = useMutation({
    mutationFn: postReset,
    onSuccess: (data) => {
      // Wipe every cached query — nearly every page reflects the cleared data.
      qc.invalidateQueries();
      const { cleared, scope } = data;
      const where = scope?.is_global ? 'all states' : scope?.state_name ?? 'your state';
      toast.success(
        `Reset complete for ${where} — cleared ${cleared.stock_movements} movements, ${cleared.tool_usage} usage entries, ${cleared.facility_stock} stock balances`,
        { duration: 6000 }
      );
      closeAndReset();
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Reset failed'),
  });

  function closeAndReset() {
    setModalOpen(false);
    setConfirmation('');
    setPassword('');
  }

  const ready = confirmation === 'RESET' && password.length > 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="System settings"
        subtitle="System-level controls and destructive admin tools."
      />

      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-50">
              <ShieldAlert size={18} className="text-red-600" />
            </div>
            <div>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Destructive admin tools. Read every step before clicking — these actions cannot be undone.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
            <p className="font-medium text-ink">
              {isSuper ? 'Reset operational data — all states' : 'Reset operational data — your state'}
            </p>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              Permanently deletes stock movements, daily usage entries, facility stock balances, and the
              HQ→state ledger (what HQ sent + the state balance). Users, facilities, tools, thematic areas,
              and low-stock thresholds are all preserved.
            </p>
            <p className="mt-2 text-xs text-muted">
              {isSuper
                ? 'As HQ, this clears EVERY state at once. Use it to wipe all test data before going live.'
                : `This clears only ${user?.state_name ?? 'your state'} — other states are untouched.`}
            </p>
            <Button
              variant="danger"
              className="mt-4"
              leftIcon={<Trash2 size={15} />}
              onClick={() => setModalOpen(true)}
            >
              Reset operational data
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal open={modalOpen} onClose={closeAndReset} title="Reset operational data?">
        <div className="space-y-4">
          {/* Hard warning */}
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>This action is permanent and cannot be undone. Read the preview carefully.</p>
          </div>

          {/* Scope banner — makes the blast radius unmistakable. */}
          <div className={`rounded-lg border px-3 py-2 text-sm ${
            preview.is_global
              ? 'border-red-300 bg-red-100/60 text-red-800'
              : 'border-brand-200 bg-brand-50 text-brand-900'
          }`}>
            {previewLoading
              ? 'Checking scope…'
              : preview.is_global
                ? 'Scope: ALL STATES. This clears every state’s data at once.'
                : `Scope: ${preview.state_name ?? 'your state'} only. Other states are not touched.`}
          </div>

          {/* Preview of counts to be deleted */}
          <div className="rounded-lg border border-line p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">Will be permanently deleted:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span>Stock movements</span>
                <span className="font-mono num font-semibold">{previewLoading ? '…' : preview.stock_movements ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span>Tool usage entries</span>
                <span className="font-mono num font-semibold">{previewLoading ? '…' : preview.tool_usage ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span>Facility stock balances</span>
                <span className="font-mono num font-semibold">{previewLoading ? '…' : preview.facility_stock ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span>HQ→state distributions</span>
                <span className="font-mono num font-semibold">{previewLoading ? '…' : preview.state_movements ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span>State stock balances</span>
                <span className="font-mono num font-semibold">{previewLoading ? '…' : preview.state_stock ?? '—'}</span>
              </li>
            </ul>
            {preview.open_disputes > 0 && (
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-accent-700">
                Note: {preview.open_disputes} unresolved dispute{preview.open_disputes !== 1 ? 's are' : ' is'} included in the movement count above.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Users, facilities, tools, thematic areas, and low-stock thresholds remain untouched.
            </p>
          </div>

          {/* Confirmation requirements */}
          <Field id="confirmation" label="Type RESET to confirm" required>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </Field>

          <Field
            id="password"
            label="Confirm your password"
            hint="Re-entering your password prevents accidental clicks."
            required
          >
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your admin password"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeAndReset}>Cancel</Button>
            <Button
              variant="danger"
              loading={mutation.isPending}
              leftIcon={<Trash2 size={15} />}
              disabled={!ready}
              onClick={() => mutation.mutate({ confirmation, password })}
            >
              Reset everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
