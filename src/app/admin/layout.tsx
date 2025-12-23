// Server component layout - CSS imports here load synchronously
import './globals.css';
import AdminLayoutClient from './layout-client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
