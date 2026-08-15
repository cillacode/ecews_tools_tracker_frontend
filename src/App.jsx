import { Routes, Route, Navigate } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { AppLayout }   from './components/layout/AppLayout';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Incoming       from './pages/Incoming';
import HqReceipts      from './pages/state/HqReceipts';
import Usage          from './pages/Usage';
import Tools          from './pages/Tools';
import Facilities     from './pages/Facilities';
import FacilityDetail from './pages/FacilityDetail';
import Distribution   from './pages/Distribution';
import StateInventory  from './pages/StateInventory';
import StockAdjust    from './pages/StockAdjust';
import Transfer       from './pages/Transfer';
import Movements      from './pages/Movements';
import LowStock       from './pages/LowStock';
import Procurement    from './pages/Procurement';
import Reports        from './pages/Reports';
import Import         from './pages/Import';
import Users          from './pages/Users';
import SettingsPage   from './pages/Settings';
import NotFound       from './pages/NotFound';

// Shorthand: wrap a page with a role check using RequireAuth's children mode.
const Gated = (roles, Page) => <RequireAuth roles={roles}><Page /></RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index                  element={<Navigate to="/dashboard" replace />} />
          {/* Open to all authed roles */}
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/movements"      element={<Movements />} />
          {/* Facility detail stays open — DSO dashboard drill-down links here
              (backend still enforces facility/LGA/state scope per role). */}
          <Route path="/facilities/:id" element={<FacilityDetail />} />

          {/* Catalogue + directory — HQ and state admins only */}
          <Route path="/tools"          element={Gated(['admin'], Tools)} />
          <Route path="/facilities"     element={Gated(['admin'], Facilities)} />
          <Route path="/low-stock"      element={Gated(['admin', 'central_logistics', 'viewer'], LowStock)} />
          <Route path="/procurement"    element={Gated(['admin'], Procurement)} />
          <Route path="/state-stock"    element={Gated(['admin'], StateInventory)} />

          {/* State admin — acknowledge HQ receipts */}
          <Route path="/hq-receipts"    element={Gated(['admin'], HqReceipts)} />

          {/* Facility-user only */}
          <Route path="/incoming"       element={Gated(['facility_user'], Incoming)} />
          <Route path="/usage"          element={Gated(['facility_user'], Usage)} />

          {/* Stock operations — Distribution merges the old Receive + Bulk issue */}
          <Route path="/distribution"   element={Gated(['admin', 'central_logistics'], Distribution)} />
          {/* Legacy routes kept alive: old links land on the right tab */}
          <Route path="/stock/receive"  element={
            <RequireAuth roles={['admin', 'central_logistics']}><Distribution initialTab="single" /></RequireAuth>
          } />
          <Route path="/stock/bulk"     element={
            <RequireAuth roles={['admin', 'central_logistics']}><Distribution initialTab="bulk" /></RequireAuth>
          } />
          <Route path="/stock/transfer" element={Gated(['facility_user'], Transfer)} />
          <Route path="/stock/adjust"   element={Gated(['admin'], StockAdjust)} />

          {/* Reports & admin */}
          <Route path="/reports"        element={Gated(['admin', 'central_logistics', 'viewer', 'dso'], Reports)} />
          <Route path="/import"         element={Gated(['admin'], Import)} />
          <Route path="/users"          element={Gated(['admin'], Users)} />
          <Route path="/settings"       element={Gated(['admin'], SettingsPage)} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
