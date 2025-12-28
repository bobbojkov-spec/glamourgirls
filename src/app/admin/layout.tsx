// Server component layout - CSS imports here load synchronously
// This prevents FOUC (Flash of Unstyled Content)
import './globals.css';
import AdminLayoutClient from './layout-client';
import { Suspense } from 'react';
import LoadingFallback from './loading-fallback';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Font variable is applied at root layout level
  // CSS loads synchronously here to prevent flickering
  // Wrap children in Suspense to prevent loading flashes
  return (
    <AdminLayoutClient>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </AdminLayoutClient>
  );
}
