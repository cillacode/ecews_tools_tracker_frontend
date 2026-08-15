import {
  LayoutDashboard,
  Inbox,
  Wrench,
  Building2,
  PackagePlus,
  ScrollText,
  SlidersHorizontal,
  ArrowLeftRight,
  BarChart2,
  Upload,
  Users,
  ClipboardList,
  Settings,
  ShoppingCart,
  Boxes,
} from 'lucide-react';

// Each item lists the roles that may see it. A user sees an item iff their role
// is in the list. super_admin is listed explicitly only where HQ needs it —
// the HQ tier operates on STATES, so it gets Receive / Bulk / Movements (which
// branch to state-level pages) but NOT Transfer / Adjust / Reports / Import.

const EVERYONE = ['super_admin', 'admin', 'central_logistics', 'facility_user', 'dso', 'viewer'];

// `label` is the default; `labelByRole` overrides it for specific roles (the
// same route can read differently on the HQ vs state vs facility dashboards).
export const NAV_ITEMS = [
  // ── Main ──────────────────────────────────────────────────────────────────
  { to: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard,   mobile: true,  roles: EVERYONE },
  { to: '/hq-receipts',     label: 'Incoming stock', icon: Inbox,           mobile: true,  roles: ['admin'] },
  { to: '/incoming',        label: 'Incoming stock', icon: Inbox,           mobile: true,  roles: ['facility_user'] },
  { to: '/usage',           label: 'Tool usage',   icon: ClipboardList,     mobile: true,  roles: ['facility_user'] },
  // HQ has the national catalogue as its own item; the state admin's tools live
  // inside the "State inventory" tabs, so it is HQ-only here.
  { to: '/tools',           label: 'Tools Catalogue', icon: Wrench,         mobile: true,  roles: ['super_admin'] },
  // HQ browses by State (drill-down to facilities); state admins see Facilities.
  { to: '/facilities',      label: 'Facilities', labelByRole: { super_admin: 'States' }, icon: Building2, mobile: true, roles: ['super_admin', 'admin'] },

  // ── Stock operations ──────────────────────────────────────────────────────
  // Stock distribution (single + bulk tabs): super_admin = state-tier forms;
  // admin/central = facility-tier forms.
  { to: '/distribution',    label: 'Stock distribution', icon: PackagePlus, mobile: true, primary: true, roles: ['super_admin', 'admin', 'central_logistics'] },
  // The state's own tool ledger — received / distributed / balance left.
  { to: '/state-stock',     label: 'State inventory', icon: Boxes,          mobile: false, roles: ['admin'] },
  { to: '/stock/adjust',    label: 'Stock Adjustments', icon: SlidersHorizontal, mobile: false, roles: ['admin'] },
  // Facility-level redistribution between facilities — facility users only.
  { to: '/stock/transfer',  label: 'Stock redistribution', icon: ArrowLeftRight, mobile: false, roles: ['facility_user'] },

  // ── Records & admin ───────────────────────────────────────────────────────
  // Movements: super_admin = state-tier log ("State inventory"); everyone else
  // = facility-tier ("Stock movement").
  { to: '/movements',       label: 'Stock movement', labelByRole: { super_admin: 'State inventory' }, icon: ScrollText, mobile: false, roles: EVERYONE },
  // HQ calls it "Procurement"; the state team calls it "Tools request".
  { to: '/procurement',     label: 'Tools request', labelByRole: { super_admin: 'Procurement' }, icon: ShoppingCart, mobile: false, roles: ['super_admin', 'admin'] },
  // HQ works from the state-tier dashboard/movements; reports are a state-level concern.
  { to: '/reports',         label: 'Reports',      icon: BarChart2,         mobile: false, roles: ['admin', 'central_logistics', 'viewer', 'dso'] },
  { to: '/import',          label: 'Import',       icon: Upload,            mobile: false, roles: ['super_admin', 'admin'] },
  { to: '/users',           label: 'User management', icon: Users,          mobile: false, roles: ['super_admin', 'admin'] },
  { to: '/settings',        label: 'System settings', icon: Settings,       mobile: false, roles: ['super_admin', 'admin'] },
];

export function visibleNavItems(role, { mobile = false } = {}) {
  return NAV_ITEMS
    .filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (mobile && !item.mobile) return false;
      return true;
    })
    // Resolve the per-role label so the nav components can stay dumb.
    .map((item) => ({ ...item, label: item.labelByRole?.[role] ?? item.label }));
}
