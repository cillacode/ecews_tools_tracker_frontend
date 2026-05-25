import { Routes, Route, Navigate } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { AppLayout }   from './components/layout/AppLayout';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Incoming       from './pages/Incoming';
import Usage          from './pages/Usage';
import Tools          from './pages/Tools';
import Facilities     from './pages/Facilities';
import FacilityDetail from './pages/FacilityDetail';
import ReceiveStock   from './pages/ReceiveStock';
import StockAdjust    from './pages/StockAdjust';
import Transfer       from './pages/Transfer';
import BulkIssue      from './pages/BulkIssue';
import Movements      from './pages/Movements';
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
          <Route path="/tools"          element={<Tools />} />
          <Route path="/facilities"     element={<Facilities />} />
          <Route path="/facilities/:id" element={<FacilityDetail />} />
          <Route path="/movements"      element={<Movements />} />

          {/* Facility-user only */}
          <Route path="/incoming"       element={Gated(['facility_user'], Incoming)} />
          <Route path="/usage"          element={Gated(['facility_user'], Usage)} />

          {/* Stock operations */}
          <Route path="/stock/receive"  element={Gated(['admin', 'central_logistics'], ReceiveStock)} />
          <Route path="/stock/bulk"     element={Gated(['admin', 'central_logistics'], BulkIssue)} />
          <Route path="/stock/transfer" element={Gated(['admin', 'facility_user'], Transfer)} />
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
