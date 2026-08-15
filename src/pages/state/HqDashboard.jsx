import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wrench, Map, Building2, PackagePlus, Boxes, ChevronRight, ArrowRight, Home,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { getHqKpis, getHqCoverage } from '../../api/dashboard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/formatters';

function StatCard({ label, value, hint, icon: Icon, loading }) {
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
          <Icon size={16} className="text-muted" />
        </div>
        {loading ? (
          <div className="h-10 flex items-center"><Spinner size={18} /></div>
        ) : (
          <>
            <div className="font-serif text-4xl italic leading-none num text-ink">{value ?? '—'}</div>
            <div className="mt-2 text-xs text-muted">{hint}</div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function HqKpiCards() {
  const { data, isLoading } = useQuery({ queryKey: ['hq-kpis'], queryFn: getHqKpis });
  const k = data?.data ?? {};
  const cards = [
    { label: 'Tools',        value: k.total_tools,        hint: 'national catalogue',     icon: Wrench },
    { label: 'States',       value: k.total_states,       hint: 'in the programme',       icon: Map },
    { label: 'Facilities',   value: k.total_facilities,   hint: 'across all states',      icon: Building2 },
    { label: 'HQ receipts',  value: k.hq_movements_month, hint: 'recorded this month',    icon: PackagePlus },
    { label: 'Distributed',  value: k.total_distributed,  hint: 'total units sent to states', icon: Boxes },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
      {cards.map((c) => <StatCard key={c.label} {...c} loading={isLoading} />)}
    </div>
  );
}

// Breadcrumb-driven drill-down. `view` is one of:
//   { level: 'states' }
//   { level: 'lgas', stateId, stateName }
//   { level: 'facilities', lgaId, lgaName, stateName }
export default function HqDashboard() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const [view, setView] = useState({ level: 'states' });

  const params =
    view.level === 'lgas'       ? { level: 'lgas', state_id: view.stateId } :
    view.level === 'facilities' ? { level: 'facilities', lga_id: view.lgaId } :
                                  { level: 'states' };

  const { data, isLoading } = useQuery({
    queryKey: ['hq-coverage', params],
    queryFn:  () => getHqCoverage(params),
  });
  const rows = data?.data ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="National overview — tools distributed from HQ, drilled down by state, LGA, and facility."
        actions={
          <Link to="/distribution">
            <Button variant="primary" leftIcon={<PackagePlus size={16} />}>New distribution</Button>
          </Link>
        }
      />

      <section aria-label="Key metrics" className="mb-8">
        <HqKpiCards />
      </section>

      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-sm">
        <button
          onClick={() => setView({ level: 'states' })}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${view.level === 'states' ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
        >
          <Home size={13} /> All states
        </button>
        {view.level !== 'states' && (
          <>
            <ChevronRight size={13} className="text-muted" />
            <button
              onClick={() => setView({ level: 'lgas', stateId: view.stateId, stateName: view.stateName })}
              className={`rounded px-1.5 py-0.5 ${view.level === 'lgas' ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {view.stateName}
            </button>
          </>
        )}
        {view.level === 'facilities' && (
          <>
            <ChevronRight size={13} className="text-muted" />
            <span className="px-1.5 py-0.5 font-semibold text-ink">{view.lgaName}</span>
          </>
        )}
      </nav>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {view.level === 'states'     && 'States'}
              {view.level === 'lgas'       && `LGAs in ${view.stateName}`}
              {view.level === 'facilities' && `Facilities in ${view.lgaName}`}
            </CardTitle>
            <CardDescription>
              {view.level === 'states'     && 'Click a state to see its LGAs.'}
              {view.level === 'lgas'       && 'Click an LGA to see its facilities.'}
              {view.level === 'facilities' && 'Stock currently held at each facility.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-12"><Spinner /></div>
          ) : rows.length === 0 ? (
            <div className="grid place-items-center px-6 py-12 text-center">
              <p className="text-sm text-muted">Nothing to show here yet.</p>
            </div>
          ) : view.level === 'states' ? (
            <StateTable rows={rows} onDrill={(r) => setView({ level: 'lgas', stateId: r.state_id, stateName: r.state_name })} />
          ) : view.level === 'lgas' ? (
            <LgaTable rows={rows} onDrill={(r) => setView({ level: 'facilities', lgaId: r.lga_id, lgaName: r.lga_name, stateName: view.stateName })} />
          ) : (
            <FacilityTable rows={rows} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StateTable({ rows, onDrill }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-stone-50/60 text-left">
            <th className="px-5 py-3 font-medium text-muted">State</th>
            <th className="px-5 py-3 font-medium text-muted text-right">HQ sent</th>
            <th className="px-5 py-3 font-medium text-muted text-right">Facilities</th>
            <th className="px-5 py-3 font-medium text-muted text-right">In facilities</th>
            <th className="px-5 py-3 font-medium text-muted">Last movement</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.state_id} className="cursor-pointer hover:bg-stone-50/60 transition-colors" onClick={() => onDrill(r)}>
              <td className="px-5 py-3"><span className="font-medium text-ink">{r.state_name}</span></td>
              <td className="px-5 py-3 text-right num font-semibold text-brand-700">{r.hq_sent_qty}</td>
              <td className="px-5 py-3 text-right num text-muted">{r.facility_count}</td>
              <td className="px-5 py-3 text-right num text-ink">{r.facility_qty}</td>
              <td className="px-5 py-3 text-xs text-muted">{formatDateTime(r.last_movement_at)}</td>
              <td className="px-5 py-3 text-right"><ArrowRight size={15} className="text-muted" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LgaTable({ rows, onDrill }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-stone-50/60 text-left">
            <th className="px-5 py-3 font-medium text-muted">LGA</th>
            <th className="px-5 py-3 font-medium text-muted text-right">Facilities</th>
            <th className="px-5 py-3 font-medium text-muted text-right">Tools stocked</th>
            <th className="px-5 py-3 font-medium text-muted text-right">Total qty</th>
            <th className="px-5 py-3 font-medium text-muted">Last movement</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.lga_id} className="cursor-pointer hover:bg-stone-50/60 transition-colors" onClick={() => onDrill(r)}>
              <td className="px-5 py-3"><span className="font-medium text-ink">{r.lga_name}</span></td>
              <td className="px-5 py-3 text-right num text-muted">{r.facility_count}</td>
              <td className="px-5 py-3 text-right num text-ink">{r.tools_stocked}</td>
              <td className="px-5 py-3 text-right num text-ink">{r.facility_qty}</td>
              <td className="px-5 py-3 text-xs text-muted">{formatDateTime(r.last_movement_at)}</td>
              <td className="px-5 py-3 text-right"><ArrowRight size={15} className="text-muted" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FacilityTable({ rows }) {
  return (
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
          {rows.map((r) => {
            const pct = r.tools_on_record > 0 ? Math.round((r.tools_stocked / r.tools_on_record) * 100) : 0;
            const color = pct >= 80 ? 'text-brand-700' : pct >= 40 ? 'text-accent-700' : 'text-red-600';
            return (
              <tr key={r.facility_id} className="hover:bg-stone-50/60 transition-colors">
                <td className="px-5 py-3">
                  <Link to={`/facilities/${r.facility_id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                    {r.facility_name}
                  </Link>
                </td>
                <td className={`px-5 py-3 text-right num font-medium ${color}`}>{r.tools_stocked} / {r.tools_on_record}</td>
                <td className="px-5 py-3 text-right num text-ink">{r.facility_qty}</td>
                <td className="px-5 py-3 text-xs text-muted">{formatDateTime(r.last_movement_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
