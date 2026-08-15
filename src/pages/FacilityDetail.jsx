import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacility, getFacilityStock } from '../api/facilities';
import { downloadFacilityGatePass } from '../api/reports';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime, stockLevel } from '../lib/formatters';

// Modal to pick tools + quantities for a delivery note, then download the PDF.
function GatePassModal({ open, onClose, facilityId, stockRows }) {
  // sel[tool_id] = { checked, qty }
  const [sel, setSel] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialise selection when opened: all in-stock tools checked at full qty.
  function ensureInit() {
    if (Object.keys(sel).length === 0 && stockRows.length > 0) {
      const init = {};
      for (const r of stockRows) init[r.tool_id] = { checked: r.quantity > 0, qty: String(r.quantity) };
      setSel(init);
    }
  }
  if (open) ensureInit();

  function toggle(id) { setSel((s) => ({ ...s, [id]: { ...s[id], checked: !s[id]?.checked } })); }
  function setQty(id, v) { setSel((s) => ({ ...s, [id]: { ...s[id], qty: v } })); }

  async function handleDownload() {
    const lines = stockRows
      .filter((r) => sel[r.tool_id]?.checked)
      .map((r) => ({ tool_id: r.tool_id, quantity: parseInt(sel[r.tool_id].qty, 10) }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) { toast.error('Select at least one tool with a quantity'); return; }
    setLoading(true);
    try {
      await downloadFacilityGatePass({ facility_id: Number(facilityId), lines });
      toast.success('Delivery note downloaded');
      onClose();
    } catch {
      toast.error('Failed to generate delivery note');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Print delivery note" size="lg">
      <p className="mb-3 text-sm text-muted">Select the tools going to this facility and confirm quantities.</p>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-line divide-y divide-line">
        {stockRows.map((r) => (
          <label key={r.tool_id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-stone-50">
            <input
              type="checkbox"
              checked={sel[r.tool_id]?.checked ?? false}
              onChange={() => toggle(r.tool_id)}
              className="rounded border-line accent-brand-700"
            />
            <span className="flex-1 text-sm text-ink">{r.tool_name}</span>
            <Input
              type="number" min="1" step="1"
              value={sel[r.tool_id]?.qty ?? ''}
              onChange={(e) => setQty(r.tool_id, e.target.value)}
              className="w-24"
              disabled={!sel[r.tool_id]?.checked}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={loading} leftIcon={<Printer size={15} />} onClick={handleDownload}>Download PDF</Button>
      </div>
    </Modal>
  );
}

export default function FacilityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [gatePassOpen, setGatePassOpen] = useState(false);
  const canPrint = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: facData, isLoading: facLoading } = useQuery({
    queryKey: ['facility', id],
    queryFn: () => getFacility(id),
  });

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['facility-stock', id],
    queryFn: () => getFacilityStock(id),
  });

  const facility  = facData?.data;
  const stockRows = stockData?.data ?? [];

  // Group stock by thematic area
  const grouped = [];
  const seen = new Map();
  for (const row of stockRows) {
    if (!seen.has(row.thematic_area_id)) {
      seen.set(row.thematic_area_id, { id: row.thematic_area_id, name: row.thematic_area_name, rows: [] });
      grouped.push(seen.get(row.thematic_area_id));
    }
    seen.get(row.thematic_area_id).rows.push(row);
  }

  if (facLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/facilities"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={14} />
        All facilities
      </Link>

      <PageHeader
        title={facility?.name ?? '—'}
        subtitle={facility ? `${facility.lga_name} · ${facility.state_name}` : ''}
        actions={
          <div className="flex items-center gap-2">
            {canPrint && stockRows.length > 0 && (
              <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={() => setGatePassOpen(true)}>
                Print delivery note
              </Button>
            )}
            <Link to={`/stock/receive?facility_id=${id}`}>
              <Button variant="primary" leftIcon={<PackagePlus size={16} />}>
                New distribution
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stock summary cards */}
      {!stockLoading && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Tools on record</p>
              <p className="mt-1 font-serif text-3xl italic num text-ink">{stockRows.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Tools with stock</p>
              <p className="mt-1 font-serif text-3xl italic num text-brand-700">
                {stockRows.filter((r) => r.quantity > 0).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Total quantity</p>
              <p className="mt-1 font-serif text-3xl italic num text-ink">
                {stockRows.reduce((s, r) => s + r.quantity, 0)}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Stock table grouped by thematic area */}
      {stockLoading ? (
        <div className="grid place-items-center py-12">
          <Spinner />
        </div>
      ) : stockRows.length === 0 ? (
        <Card>
          <CardBody>
            <div className="grid place-items-center px-6 py-12 text-center">
              <p className="text-sm text-muted">No stock recorded for this facility yet.</p>
              <Link to={`/stock/receive?facility_id=${id}`} className="mt-3">
                <Button size="sm">Record first distribution</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.rows.length} tool{group.rows.length !== 1 ? 's' : ''}</CardDescription>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-stone-50/60 text-left">
                      <th className="px-5 py-3 font-medium text-muted">Tool</th>
                      <th className="px-5 py-3 font-medium text-muted">Status</th>
                      <th className="px-5 py-3 font-medium text-muted text-right">Quantity</th>
                      <th className="px-5 py-3 font-medium text-muted">Stock level</th>
                      <th className="px-5 py-3 font-medium text-muted">Last movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {group.rows.map((row) => {
                      const lvl = stockLevel(row.quantity);
                      return (
                      <tr key={row.tool_id} className="hover:bg-stone-50/40 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-medium text-ink">{row.tool_name}</span>
                          <span className="ml-2 inline-flex gap-1">
                            {row.is_new_indicator && <Badge tone="amber" className="text-[10px]">[N]</Badge>}
                            {row.is_ip_retained   && <Badge tone="neutral" className="text-[10px]">[IP]</Badge>}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={row.tool_status === 'NEW_MODIFIED' ? 'brand' : 'neutral'}>
                            {row.tool_status === 'NEW_MODIFIED' ? 'New / Modified' : 'Retained'}
                          </Badge>
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold num ${row.quantity === 0 ? 'text-red-600' : 'text-ink'}`}>
                          {row.quantity}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lvl.badge}`}>
                            {lvl.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted">{formatDateTime(row.last_movement_at)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      <GatePassModal
        open={gatePassOpen}
        onClose={() => setGatePassOpen(false)}
        facilityId={id}
        stockRows={stockRows}
      />
    </div>
  );
}
