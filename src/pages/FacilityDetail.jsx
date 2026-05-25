import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { getFacility, getFacilityStock } from '../api/facilities';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '../lib/formatters';

export default function FacilityDetail() {
  const { id } = useParams();

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
          <Link to={`/stock/receive?facility_id=${id}`}>
            <Button variant="primary" leftIcon={<PackagePlus size={16} />}>
              Record receipt
            </Button>
          </Link>
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
                <Button size="sm">Record first receipt</Button>
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
                      <th className="px-5 py-3 font-medium text-muted">Last movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {group.rows.map((row) => (
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
                        <td className="px-5 py-3 text-xs text-muted">{formatDateTime(row.last_movement_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
