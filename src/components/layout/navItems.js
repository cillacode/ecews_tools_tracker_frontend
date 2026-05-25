import {
  LayoutDashboard,
  Inbox,
  Wrench,
  Building2,
  PackagePlus,
  ScrollText,
  SlidersHorizontal,
  ArrowLeftRight,
  PackageCheck,
  BarChart2,
  Upload,
  Users,
  ClipboardList,
  Settings,
} from 'lucide-react';

// Each item carries a `roles` array — a user only sees items whose array
// includes their role. Sidebar and MobileNav both filter using this.

const ALL = ['admin', 'central_logistics', 'facility_user', 'dso', 'viewer'];

export const NAV_ITEMS = [
  // ── Main ──────────────────────────────────────────────────────────────────
  { to: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard,   mobile: true,  roles: ALL },
  { to: '/incoming',        label: 'Incoming',     icon: Inbox,             mobile: true,  roles: ['facility_user'] },
  { to: '/usage',           label: 'Tool usage',   icon: ClipboardList,     mobile: true,  roles: ['facility_user'] },
  { to: '/tools',           label: 'Tools',        icon: Wrench,            mobile: true,  roles: ALL },
  { to: '/facilities',      label: 'Facilities',   icon: Building2,         mobile: true,  roles: ALL },

  // ── Stock operations ──────────────────────────────────────────────────────
  { to: '/stock/receive',   label: 'Receive',      icon: PackagePlus,       mobile: true, primary: true, roles: ['admin', 'central_logistics'] },
  { to: '/stock/adjust',    label: 'Adjust stock', icon: SlidersHorizontal, mobile: false, roles: ['admin'] },
  { to: '/stock/transfer',  label: 'Transfer',     icon: ArrowLeftRight,    mobile: false, roles: ['admin', 'facility_user'] },
  { to: '/stock/bulk',      label: 'Bulk issue',   icon: PackageCheck,      mobile: false, roles: ['admin', 'central_logistics'] },

  // ── Records & admin ───────────────────────────────────────────────────────
  { to: '/movements',       label: 'Movements',    icon: ScrollText,        mobile: false, roles: ALL },
  { to: '/reports',         label: 'Reports',      icon: BarChart2,         mobile: false, roles: ['admin', 'central_logistics', 'viewer', 'dso'] },
  { to: '/import',          label: 'Import',       icon: Upload,            mobile: false, roles: ['admin'] },
  { to: '/users',           label: 'Users',        icon: Users,             mobile: false, roles: ['admin'] },
  { to: '/settings',        label: 'Settings',     icon: Settings,          mobile: false, roles: ['admin'] },
];

export function visibleNavItems(role, { mobile = false } = {}) {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (mobile && !item.mobile)     return false;
    return true;
  });
}
