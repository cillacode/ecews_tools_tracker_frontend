import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight, ArrowLeft, Building2, MapPin } from 'lucide-react';
import { getStatesSummary, getFacilities, getLgas } from '../api/facilities';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';

// HQ browses facilities by STATE: a list of states → drill into one → its
// facilities grouped by LGA, with an LGA filter + search. This keeps HQ's
// mental model (state tier) distinct from the state admin's flat facility list.
export default function HqStates() {
  const [state, setState] = useState(null); // { id, name } or null = states list
  if (!state) return <StatesList onSelect={setState} />;
  return <StateFacilities state={state} onBack={() => setState(null)} />;
}

// ── Level 1: the three states ──────────────────────────────────────────────────
function StatesList({ onSelect }) {
  const { data, isLoading } = useQuery({ queryKey: ['states-summary'], queryFn: getStatesSummary });
  const states   = data?.data ?? [];
  const totalFac = states.reduce((s, r) => s + r.facility_count, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="States"
        subtitle={`${totalFac} facilities across ${states.length} states. Select a state to view its facilities.`}
      />

      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect({ id: s.id, name: s.name })}
              className="group flex items-center justify-between rounded-xl border border-line bg-white p-5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="min-w-0">
                <p className="font-serif text-xl italic text-ink">{s.name}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Building2 size={13} />{s.facility_count} facilities</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={13} />{s.lga_count} LGAs</span>
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-muted group-hover:text-brand-700" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Level 2: facilities within a state ─────────────────────────────────────────
function StateFacilities({ state, onBack }) {
  const [search, setSearch] = useState('');
  const [lgaId,  setLgaId]  = useState('');

  const { data: facData, isLoading } = useQuery({
    queryKey: ['facilities', { state: state.id }],
    queryFn:  () => getFacilities({ state_id: state.id, limit: 1000 }),
  });
  const { data: lgaData } = useQuery({
    queryKey: ['lgas', { state: state.id }],
    queryFn:  () => getLgas({ state_id: state.id }),
  });

  const allFacilities = facData?.data ?? [];
  const total         = facData?.meta?.total ?? allFacilities.length;
  const lgas          = lgaData?.data ?? [];

  const filtered = useMemo(() => {
    let list = allFacilities;
    if (lgaId) list = list.filter((f) => String(f.lga_id) === lgaId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [allFacilities, lgaId, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of filtered) {
      if (!map.has(f.lga_name)) map.set(f.lga_name, []);
      map.get(f.lga_name).push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        All states
      </button>

      <PageHeader
        title={state.name}
        subtitle={`${total} facilities across ${lgas.length} LGAs.`}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities…"
            className="pl-9"
          />
        </div>
        <Select value={lgaId} onChange={(e) => setLgaId(e.target.value)} className="w-full sm:w-52">
          <option value="">All LGAs</option>
          {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="grid place-items-center px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {search || lgaId ? 'No facilities match your filters.' : 'No facilities found.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([lgaName, facilities]) => (
            <Card key={lgaName}>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">{lgaName}</span>
                <span className="pill border-line bg-stone-50 text-muted">{facilities.length}</span>
              </div>
              <ul className="divide-y divide-line">
                {facilities.map((f) => (
                  <li key={f.id}>
                    <Link
                      to={`/facilities/${f.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-stone-50/60 transition-colors group"
                    >
                      <span className="text-sm font-medium text-ink group-hover:text-brand-700">{f.name}</span>
                      <ChevronRight size={16} className="text-muted group-hover:text-brand-700" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
