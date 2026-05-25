// Protects a route. Two usage patterns:
//
//  1. Layout route (no children — renders <Outlet/>):
//       <Route element={<RequireAuth />}>
//         <Route path="/dashboard" element={<Dashboard />} />
//       </Route>
//
//  2. Inline wrapper (with children — renders them when role passes):
//       <Route path="/incoming" element={
//         <RequireAuth roles={['facility_user']}><Incoming /></RequireAuth>
//       } />
//
// Pattern 2 avoids nested layout routes, which can mis-match in react-router v6
// when a chain of pathless layout routes wraps a path route.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Spinner } from '../components/ui/Spinner';

export function RequireAuth({ roles, children }) {
  const { isAuthenticated, bootstrapping, user } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? <Outlet />;
}
