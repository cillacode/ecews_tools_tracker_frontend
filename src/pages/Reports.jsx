import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Download, ClipboardList, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities, getStates, getLgas } from '../api/facilities';
import { downloadMovements, downloadFacilityStock, downloadCoveragePivot, downloadUsage } from '../api/reports';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const MOVEMENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'RECEIPT',             label: 'Receipt' },
  { value: 'ADJUSTMENT_INCREASE', label: 'Adjustment +' },
  { value: 'ADJUSTMENT_DECREASE', label: 'Adjustment −' },
  { value: 'TRANSFER_OUT',        label: 'Transfer Out' },
  { value: 'TRANSFER_IN',         label: 'Transfer In' },
];

function ReportCard({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50">
            <Icon size={18} className="text-brand-700" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default function Reports() {
  // Movements report filters
  const [movType,       setMovType]       = useState('');
  const [movFacility,   setMovFacility]   = useState('');
  const [movFrom,       setMovFrom]       = useState('');
  const [movTo,         setMovTo]         = useState('');
  const [movLoading,    setMovLoading]    = useState(false);

  // Facility stock filters
  const [stockFacility, setStockFacility] = useState('');
  const [stockLoading,  setStockLoading]  = useState(false);

  const [pivotLoading,  setPivotLoading]  = useState(false);

  // Usage filters
  const [usageFacility, setUsageFacility] = useState('');
  const [usageFrom,     setUsageFrom]     = useState('');
  const [usageTo,       setUsageTo]       = useState('');
  const [usageLoading,  setUsageLoading]  = useState(false);

  // HQ geo scope — a global State / LGA narrowing applied to every report.
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [geoState, setGeoState] = useState('');
  const [geoLga,   setGeoLga]   = useState('');

  const { data: facData }   = useQuery({ queryKey: ['facilities'], queryFn: () => getFacilities({ limit: 500 }) });
  const { data: stateData } = useQuery({ queryKey: ['states'],     queryFn: getStates });
  const { data: lgaData }   = useQuery({ queryKey: ['lgas', geoState], queryFn: () => getLgas(geoState ? { state_id: geoState } : undefined) });

  const facilities = facData?.data   ?? [];
  const states     = stateData?.data ?? [];
  const lgas       = lgaData?.data   ?? [];

  // Merge the global geo scope into any report's params.
  const geo = { state_id: geoState || undefined, lga_id: geoLga || undefined };

  async function handleDownload(fn, setLoading, label) {
    setLoading(true);
    try {
      await fn();
      toast.success(`${label} downloaded`);
    } catch {
      toast.error(`Failed to download ${label}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Download data snapshots as Excel files. Filters apply to the exported data."
      />

      <div className="space-y-4">

        {/* HQ geo scope — narrows every report below by state / LGA */}
        {isSuperAdmin && (
          <Card className="border-brand-200 bg-brand-50/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100">
                  <Globe size={18} className="text-brand-700" />
                </div>
                <div>
                  <CardTitle>Report scope</CardTitle>
                  <CardDescription>Narrow every report below to a state or LGA. Leave blank for all states.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
                <Select
                  value={geoState}
                  onChange={(e) => { setGeoState(e.target.value); setGeoLga(''); }}
                >
                  <option value="">All states</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select value={geoLga} onChange={(e) => setGeoLga(e.target.value)} disabled={!geoState}>
                  <option value="">{geoState ? 'All LGAs in state' : 'Pick a state first'}</option>
                  {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Movement log export */}
        <ReportCard
          icon={FileSpreadsheet}
          title="Movement log"
          description="Every stock receipt, adjustment, and transfer — optionally filtered."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Select value={movType} onChange={(e) => setMovType(e.target.value)}>
              {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select value={movFacility} onChange={(e) => setMovFacility(e.target.value)}>
              <option value="">All facilities</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Input type="date" value={movFrom} onChange={(e) => setMovFrom(e.target.value)} />
            <Input type="date" value={movTo}   onChange={(e) => setMovTo(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              loading={movLoading}
              leftIcon={<Download size={15} />}
              onClick={() => handleDownload(
                () => downloadMovements({ ...geo, type: movType || undefined, facility_id: movFacility || undefined, from: movFrom || undefined, to: movTo || undefined }),
                setMovLoading, 'Movement log'
              )}
            >
              Download .xlsx
            </Button>
          </div>
        </ReportCard>

        {/* Facility stock snapshot */}
        <ReportCard
          icon={FileSpreadsheet}
          title="Facility stock snapshot"
          description="Current stock quantities per tool at one facility or all facilities."
        >
          <Select value={stockFacility} onChange={(e) => setStockFacility(e.target.value)} className="max-w-xs">
            <option value="">All facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <div className="mt-4 flex justify-end">
            <Button
              loading={stockLoading}
              leftIcon={<Download size={15} />}
              onClick={() => handleDownload(
                () => downloadFacilityStock({ ...geo, facility_id: stockFacility || undefined }),
                setStockLoading, 'Facility stock snapshot'
              )}
            >
              Download .xlsx
            </Button>
          </div>
        </ReportCard>

        {/* Coverage pivot */}
        <ReportCard
          icon={FileSpreadsheet}
          title="Coverage pivot"
          description="LGA × Thematic Area matrix — total quantity held per cell. Cells with zero stock are highlighted red."
        >
          <p className="mb-4 text-sm text-muted">No filters — exports the full 55-facility × 10-thematic-area grid.</p>
          <div className="flex justify-end">
            <Button
              loading={pivotLoading}
              leftIcon={<Download size={15} />}
              onClick={() => handleDownload(downloadCoveragePivot, setPivotLoading, 'Coverage pivot')}
            >
              Download .xlsx
            </Button>
          </div>
        </ReportCard>

        {/* Tool usage */}
        <ReportCard
          icon={ClipboardList}
          title="Tool usage (weekly)"
          description="Counts that facility users recorded for each tool, by week. Filterable by facility and date range."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Select value={usageFacility} onChange={(e) => setUsageFacility(e.target.value)}>
              <option value="">All facilities</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Input type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)} />
            <Input type="date" value={usageTo}   onChange={(e) => setUsageTo(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              loading={usageLoading}
              leftIcon={<Download size={15} />}
              onClick={() => handleDownload(
                () => downloadUsage({ ...geo, facility_id: usageFacility || undefined, from: usageFrom || undefined, to: usageTo || undefined }),
                setUsageLoading, 'Tool usage'
              )}
            >
              Download .xlsx
            </Button>
          </div>
        </ReportCard>

      </div>
    </div>
  );
}
