'use client';

import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar in admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <aside className="sidebar py-8 px-5 flex-shrink-0 hidden lg:block">
      {/* Sidebar is now empty - links moved to header */}
    </aside>
  );
}
