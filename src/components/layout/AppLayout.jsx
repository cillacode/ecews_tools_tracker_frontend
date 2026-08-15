// The authenticated app shell.
//   - Desktop: sidebar on the left, content fills the rest
//   - Mobile:  topbar + bottom nav + scrollable content in between
//
// The Outlet renders the matched child route.

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {/* Padding-bottom on mobile makes room for the fixed bottom nav. */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
            <Outlet />
          </div>
          <Footer className="px-4 pb-6 md:px-8" />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
