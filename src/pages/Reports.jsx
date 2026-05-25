import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Download, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { downloadMovements, downloadFacilityStock, downloadCoveragePivot, downloadUsage } from '../api/reports';
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

  const { data: facData } = useQuery({ queryKey: ['facilities'], queryFn: () => getFacilities({ limit: 200 }) });
  const facilities = facData?.data ?? [];

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
                () => downloadMovements({ type: movType || undefined, facility_id: movFacility || undefined, from: movFrom || undefined, to: movTo || undefined }),
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
                () => downloadFacilityStock({ facility_id: stockFacility || undefined }),
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
                () => downloadUsage({ facility_id: usageFacility || undefined, from: usageFrom || undefined, to: usageTo || undefined }),
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
