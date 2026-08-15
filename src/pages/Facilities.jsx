import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { getFacilities, getLgas } from '../api/facilities';
import { useAuth } from '../auth/useAuth';
import HqStates from './HqStates';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';

export default function Facilities() {
  const { user } = useAuth();
  // HQ browses by State (drill-down); state admins get their flat facility list.
  if (user?.role === 'super_admin') return <HqStates />;
  return <StateFacilities stateName={user?.state_name} />;
}

function StateFacilities({ stateName }) {
  const [search,  setSearch]  = useState('');
  const [lgaId,   setLgaId]   = useState('');

  const { data: facData, isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => getFacilities({ limit: 1000 }),
  });

  const { data: lgaData } = useQuery({
    queryKey: ['lgas'],
    queryFn: getLgas,
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

  // Group by LGA for display
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
      <PageHeader
        title="Facilities"
        subtitle={`${total} facilities across ${lgas.length} LGAs${stateName ? ` of ${stateName}` : ''}.`}
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
        <Select
          value={lgaId}
          onChange={(e) => setLgaId(e.target.value)}
          className="w-full sm:w-52"
        >
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="grid place-items-center px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {search ? `No facilities match "${search}"` : 'No facilities found.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([lgaName, facilities]) => (
            <Card key={lgaName}>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {lgaName}
                </span>
                <span className="pill border-line bg-stone-50 text-muted">{facilities.length}</span>
              </div>
              <ul className="divide-y divide-line">
                {facilities.map((f) => (
                  <li key={f.id}>
                    <Link
                      to={`/facilities/${f.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-stone-50/60 transition-colors group"
                    >
                      <span className="text-sm font-medium text-ink group-hover:text-brand-700">
                        {f.name}
                      </span>
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
