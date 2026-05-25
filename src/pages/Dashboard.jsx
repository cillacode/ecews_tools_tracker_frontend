import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Building2, ScrollText, AlertCircle, ArrowRight, TriangleAlert,
  Inbox, Boxes, PackageCheck, Check, MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';
import {
  getKpis, getRecentActivity, getCoverage,
  getFacilityKpis, getFacilityRecent, getFacilityStockSummary,
  getLgaKpis, getLgaRecent, getLgaFacilities,
} from '../api/dashboard';
import { getLowStock } from '../api/thresholds';
import { getDisputes, applyDispute } from '../api/movements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  formatDateTime, MOVEMENT_LABELS, MOVEMENT_TONES, DISPUTE_REASON_LABELS,
} from '../lib/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mini components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, hint, icon: Icon, href, tone = 'normal', loading }) {
  const card = (
    <Card className="overflow-hidden transition-shadow hover:shadow-card">
      <CardBody className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
          <Icon size={16} className={tone === 'amber' ? 'text-accent-700' : tone === 'red' ? 'text-red-600' : 'text-muted'} />
        </div>
        {loading ? (
          <div className="h-10 flex items-center"><Spinner size={18} /></div>
        ) : (
          <>
            <div className={`font-serif text-4xl italic leading-none num ${
              tone === 'amber' && value > 0 ? 'text-accent-700' :
              tone === 'red'   && value > 0 ? 'text-red-600' : 'text-ink'
            }`}>
              {value ?? '—'}
            </div>
            <div className="mt-2 text-xs text-muted">{hint}</div>
          </>
        )}
      </CardBody>
    </Card>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN dashboard sections
// ─────────────────────────────────────────────────────────────────────────────

function LowStockBanner() {
  const { data } = useQuery({ queryKey: ['low-stock'], queryFn: getLowStock, staleTime: 60_000 });
  const alerts = data?.data ?? [];
  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <TriangleAlert size={18} className="mt-0.5 shrink-0 text-accent-700" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-accent-700">
          {alerts.length} low-stock alert{alerts.length !== 1 ? 's' : ''}
        </p>
        <p className="mt-0.5 text-xs text-accent-700/80">
          {alerts.slice(0, 3).map((a) => `${a.facility_name} — ${a.tool_name} (${a.quantity} of ${a.min_quantity} min)`).join(' · ')}
          {alerts.length > 3 && ` · and ${alerts.length - 3} more`}
        </p>
      </div>
    </div>
  );
}

function DisputesSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['disputes'], queryFn: getDisputes });
  const disputes = data?.data ?? [];

  const applyMutation = useMutation({
    mutationFn: applyDispute,
    onSuccess: (res) => {
      toast.success(res.data?.adjustment ? 'Adjustment applied — balance updated' : 'Dispute marked resolved');
      qc.invalidateQueries({ queryKey: ['disputes'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      qc.invalidateQueries({ queryKey: ['dashboard-coverage'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to apply'),
  });

  if (isLoading) return null;
  if (disputes.length === 0) return null;

  return (
    <Card className="mb-4 border-red-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-50">
            <TriangleAlert size={18} className="text-red-600" />
          </div>
          <div>
            <CardTitle>{disputes.length} disputed receipt{disputes.length !== 1 ? 's' : ''} need review</CardTitle>
            <CardDescription>Review the discrepancy and apply the suggested adjustment to reconcile.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-line">
          {disputes.map((d) => {
            const diff = d.quantity - d.disputed_quantity;
            return (
              <li key={d.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{d.tool_name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="font-medium text-ink">{d.facility_name}</span> · disputed by {d.ack_by_name ?? 'facility user'} · {formatDateTime(d.ack_at)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Badge tone="red">{DISPUTE_REASON_LABELS[d.dispute_reason]}</Badge>
                    <span className="text-xs text-muted">
                      Recorded <span className="font-semibold text-ink num">{d.quantity}</span> · Actual <span className="font-semibold text-red-600 num">{d.disputed_quantity}</span>
                    </span>
                  </div>
                  {d.dispute_note && (
                    <p className="mt-1 text-xs italic text-muted">"{d.dispute_note}"</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right text-xs">
                    <p className="text-muted">Suggested</p>
                    <p className="font-mono font-semibold text-red-600">
                      {diff > 0 ? `−${diff}` : 'No adjustment'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Check size={14} />}
                    loading={applyMutation.isPending && applyMutation.variables === d.id}
                    onClick={() => applyMutation.mutate(d.id)}
                  >
                    Apply
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function AdminKpiCards() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: getKpis });
  const k = data?.data ?? {};

  const cards = [
    { label: 'Tools',          value: k.total_tools,           hint: 'across 10 thematic areas',  icon: Wrench,      href: '/tools' },
    { label: 'Facilities',     value: k.total_facilities,      hint: 'across 11 LGAs in Lagos',   icon: Building2,   href: '/facilities' },
    { label: 'Movements',      value: k.movements_this_month,  hint: 'recorded this month',       icon: ScrollText,  href: '/movements' },
    { label: 'Open disputes',  value: k.open_disputes,         hint: 'awaiting resolution',       icon: TriangleAlert, tone: 'red' },
    { label: 'Zero stock',     value: k.facilities_zero_stock, hint: 'facility-tool slots at 0',  icon: AlertCircle, tone: 'amber' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
      {cards.map((c) => <StatCard key={c.label} {...c} loading={isLoading} />)}
    </div>
  );
}

function CoverageTable() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-coverage'], queryFn: getCoverage });
  const facilities = data?.data ?? [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader action={
        <Link to="/facilities">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>View all</Button>
        </Link>
      }>
        <div>
          <CardTitle>Facility coverage</CardTitle>
          <CardDescription>Stock on record per facility.</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="grid place-items-center py-10"><Spinner /></div>
        ) : facilities.length === 0 ? (
          <div className="grid place-items-center px-6 py-12 text-center">
            <p className="max-w-sm text-sm text-muted">
              Coverage data will appear once you record your first receipts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted">Facility</th>
                  <th className="px-5 py-3 font-medium text-muted">LGA</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Tools stocked</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Total qty</th>
                  <th className="px-5 py-3 font-medium text-muted">Last movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {facilities.map((f) => {
                  const pct = f.tools_on_record > 0 ? Math.round((f.tools_with_stock / f.tools_on_record) * 100) : 0;
                  const color = pct >= 80 ? 'text-brand-700' : pct >= 40 ? 'text-accent-700' : 'text-red-600';
                  return (
                    <tr key={f.facility_id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/facilities/${f.facility_id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                          {f.facility_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">{f.lga_name}</td>
                      <td className={`px-5 py-3 text-right font-medium num ${color}`}>{f.tools_with_stock} / {f.tools_on_record}</td>
                      <td className="px-5 py-3 text-right num text-ink">{f.total_quantity}</td>
                      <td className="px-5 py-3 text-muted text-xs">{formatDateTime(f.last_movement_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RecentActivity({ queryKey, queryFn }) {
  const { data, isLoading } = useQuery({ queryKey, queryFn });
  const rows = data?.data ?? [];

  return (
    <Card className="h-full">
      <CardHeader action={
        <Link to="/movements">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>View all</Button>
        </Link>
      }>
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Last 10 movements.</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="grid place-items-center py-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center px-4 py-10 text-center">
            <p className="text-sm text-muted">No movements yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                <Badge tone={MOVEMENT_TONES[m.movement_type]} className="mt-0.5 shrink-0">
                  {MOVEMENT_LABELS[m.movement_type]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{m.tool_name}</p>
                  <p className="truncate text-xs text-muted">{m.facility_name ?? m.thematic_area_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium num text-ink">{m.quantity}</p>
                  <p className="text-xs text-muted">{formatDateTime(m.performed_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function AdminDashboard({ firstName }) {
  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="A snapshot of tool distribution across the network."
        actions={
          <Link to="/stock/receive"><Button variant="primary">Record receipt</Button></Link>
        }
      />
      <LowStockBanner />
      <DisputesSection />

      <section aria-label="Key metrics" className="mb-8">
        <AdminKpiCards />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CoverageTable />
        <RecentActivity queryKey={['dashboard-recent']} queryFn={getRecentActivity} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACILITY USER dashboard
// ─────────────────────────────────────────────────────────────────────────────

function FacilityKpiCards() {
  const { data, isLoading } = useQuery({ queryKey: ['facility-kpis'], queryFn: getFacilityKpis });
  const k = data?.data ?? {};

  const cards = [
    { label: 'Pending acks',     value: k.pending_acks,         hint: 'awaiting your action',     icon: Inbox,         href: '/incoming', tone: k.pending_acks > 0 ? 'amber' : 'normal' },
    { label: 'Tools in stock',   value: k.tools_with_stock,     hint: 'with quantity > 0',        icon: Wrench },
    { label: 'Total quantity',   value: k.total_quantity,       hint: 'on hand at your facility', icon: Boxes },
    { label: 'My movements',     value: k.movements_this_month, hint: 'recorded this month',      icon: ScrollText,    href: '/movements' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {cards.map((c) => <StatCard key={c.label} {...c} loading={isLoading} />)}
    </div>
  );
}

function FacilityStockSummary() {
  const { data, isLoading } = useQuery({ queryKey: ['facility-stock-summary'], queryFn: getFacilityStockSummary });
  const rows = data?.data ?? [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div>
          <CardTitle>Stock by thematic area</CardTitle>
          <CardDescription>What you currently hold, grouped by category.</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="grid place-items-center py-10"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted">Thematic area</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Tools stocked</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Total qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.thematic_area_id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">{r.thematic_area_name}</span>
                      <span className="ml-2 pill border-line bg-stone-50 text-muted text-[10px]">{r.thematic_area_code}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium num text-ink">{r.tools_with_stock} / {r.tools_on_record}</td>
                    <td className="px-5 py-3 text-right num text-ink">{r.total_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function FacilityPendingBanner() {
  const { data } = useQuery({ queryKey: ['facility-kpis'], queryFn: getFacilityKpis });
  const pending  = data?.data?.pending_acks ?? 0;
  if (pending === 0) return null;

  return (
    <Link
      to="/incoming"
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
    >
      <Inbox size={18} className="mt-0.5 shrink-0 text-accent-700" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-accent-700">
          {pending} tool{pending !== 1 ? 's' : ''} awaiting your acknowledgement
        </p>
        <p className="mt-0.5 text-xs text-accent-700/80">
          Tap to review and confirm or dispute receipts sent to your facility.
        </p>
      </div>
      <ArrowRight size={16} className="mt-0.5 shrink-0 text-accent-700" />
    </Link>
  );
}

function FacilityDashboard({ firstName, facilityName }) {
  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          facilityName ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} className="text-brand-700" />
              You are viewing <span className="font-semibold text-ink">{facilityName}</span>
            </span>
          ) : (
            'No facility assigned to your account yet — ask an admin.'
          )
        }
        actions={
          <Link to="/incoming">
            <Button variant="primary" leftIcon={<PackageCheck size={16} />}>View incoming</Button>
          </Link>
        }
      />
      <FacilityPendingBanner />

      <section aria-label="Key metrics" className="mb-8">
        <FacilityKpiCards />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FacilityStockSummary />
        <RecentActivity queryKey={['facility-recent']} queryFn={getFacilityRecent} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DSO dashboard (LGA-scoped)
// ─────────────────────────────────────────────────────────────────────────────

function DsoKpiCards() {
  const { data, isLoading } = useQuery({ queryKey: ['lga-kpis'], queryFn: getLgaKpis });
  const k = data?.data ?? {};

  const cards = [
    { label: 'Facilities',         value: k.total_facilities,      hint: 'in your LGA',              icon: Building2 },
    { label: 'Tools in stock',     value: k.unique_tools_stocked,  hint: 'with at least 1 unit',     icon: Wrench },
    { label: 'Total quantity',     value: k.total_quantity,        hint: 'across your LGA',          icon: Boxes },
    { label: 'Movements',          value: k.movements_this_month,  hint: 'recorded this month',     icon: ScrollText, href: '/movements' },
    { label: 'Zero stock',         value: k.facilities_zero_stock, hint: 'facility-tool slots at 0', icon: AlertCircle, tone: 'amber' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
      {cards.map((c) => <StatCard key={c.label} {...c} loading={isLoading} />)}
    </div>
  );
}

function DsoFacilitiesTable() {
  const { data, isLoading } = useQuery({ queryKey: ['lga-facilities'], queryFn: getLgaFacilities });
  const rows = data?.data ?? [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader action={
        <Link to="/facilities">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>View all</Button>
        </Link>
      }>
        <div>
          <CardTitle>Facilities in your LGA</CardTitle>
          <CardDescription>Stock coverage at each facility.</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="grid place-items-center py-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center px-6 py-12 text-center">
            <p className="text-sm text-muted">No facilities found in your LGA.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted">Facility</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Tools stocked</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Total qty</th>
                  <th className="px-5 py-3 font-medium text-muted">Last movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((f) => {
                  const pct = f.tools_on_record > 0 ? Math.round((f.tools_with_stock / f.tools_on_record) * 100) : 0;
                  const color = pct >= 80 ? 'text-brand-700' : pct >= 40 ? 'text-accent-700' : 'text-red-600';
                  return (
                    <tr key={f.facility_id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/facilities/${f.facility_id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                          {f.facility_name}
                        </Link>
                      </td>
                      <td className={`px-5 py-3 text-right font-medium num ${color}`}>{f.tools_with_stock} / {f.tools_on_record}</td>
                      <td className="px-5 py-3 text-right num text-ink">{f.total_quantity}</td>
                      <td className="px-5 py-3 text-muted text-xs">{formatDateTime(f.last_movement_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DsoDashboard({ firstName, lgaName }) {
  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          lgaName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-brand-700" />
              You support <span className="font-semibold text-ink">{lgaName} LGA</span>
            </span>
          ) : (
            'No LGA assigned to your account yet — ask an admin.'
          )
        }
        actions={
          <Link to="/reports">
            <Button variant="primary" leftIcon={<ScrollText size={16} />}>Generate report</Button>
          </Link>
        }
      />

      <section aria-label="Key metrics" className="mb-8">
        <DsoKpiCards />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DsoFacilitiesTable />
        <RecentActivity queryKey={['lga-recent']} queryFn={getLgaRecent} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page entry — switches by role
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  let body;
  if (user?.role === 'facility_user') {
    body = <FacilityDashboard firstName={firstName} facilityName={user?.facility_name} />;
  } else if (user?.role === 'dso') {
    body = <DsoDashboard firstName={firstName} lgaName={user?.lga_name} />;
  } else {
    body = <AdminDashboard firstName={firstName} />;
  }

  return <div className="animate-fade-in">{body}</div>;
}
