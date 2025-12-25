'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context-admin/SidebarContext';
import { 
  DashboardOutlined, 
  UserOutlined, 
  DollarOutlined, 
  EyeOutlined,
  TeamOutlined,
  StarOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    icon: <DashboardOutlined />,
    name: 'Dashboard',
    path: '/admin',
  },
  {
    icon: <UserOutlined />,
    name: 'Girls Database',
    path: '/admin/girls',
  },
  {
    icon: <StarOutlined />,
    name: 'Featured Actresses',
    path: '/admin/featured-actresses',
  },
  {
    icon: <TeamOutlined />,
    name: 'Users',
    path: '/admin/users/admins',
  },
  {
    icon: <DollarOutlined />,
    name: 'Sales Stats',
    path: '/admin/sales',
  },
  {
    icon: <EyeOutlined />,
    name: 'Girls Stats',
    path: '/admin/girls-stats',
  },
];

// Demo pages - hidden for now (not needed)
// const demoPages = [
//   // UI Elements
//   {
//     icon: <AlertOutlined />,
//     name: 'Alerts (Demo)',
//     path: '/admin/demo/alerts',
//   },
//   {
//     icon: <UserSwitchOutlined />,
//     name: 'Avatars (Demo)',
//     path: '/admin/demo/avatars',
//   },
//   {
//     icon: <CheckCircleOutlined />,
//     name: 'Badge (Demo)',
//     path: '/admin/demo/badge',
//   },
//   {
//     icon: <AppstoreOutlined />,
//     name: 'Buttons (Demo)',
//     path: '/admin/demo/buttons',
//   },
//   {
//     icon: <PictureOutlined />,
//     name: 'Images (Demo)',
//     path: '/admin/demo/images',
//   },
//   {
//     icon: <FileTextOutlined />,
//     name: 'Modals (Demo)',
//     path: '/admin/demo/modals',
//   },
//   {
//     icon: <VideoCameraOutlined />,
//     name: 'Videos (Demo)',
//     path: '/admin/demo/videos',
//   },
//   // Charts
//   {
//     icon: <LineChartOutlined />,
//     name: 'Line Chart (Demo)',
//     path: '/admin/demo/line-chart',
//   },
//   {
//     icon: <BarChartOutlined />,
//     name: 'Bar Chart (Demo)',
//     path: '/admin/demo/bar-chart',
//   },
//   // Forms
//   {
//     icon: <FormOutlined />,
//     name: 'Form Elements (Demo)',
//     path: '/admin/demo/form-elements',
//   },
//   // Tables
//   {
//     icon: <TableOutlined />,
//     name: 'Basic Tables (Demo)',
//     path: '/admin/demo/basic-tables',
//   },
//   // Other Pages
//   {
//     icon: <CalendarOutlined />,
//     name: 'Calendar (Demo)',
//     path: '/admin/demo/calendar',
//   },
//   {
//     icon: <ProfileOutlined />,
//     name: 'Profile (Demo)',
//     path: '/admin/demo/profile',
//   },
//   {
//     icon: <FileOutlined />,
//     name: 'Blank Page (Demo)',
//     path: '/admin/demo/blank',
//   },
//   {
//     icon: <ExclamationCircleOutlined />,
//     name: '404 Error (Demo)',
//     path: '/admin/demo/error-404',
//   },
// ];

export default function AdminSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[232px] flex-col overflow-y-hidden bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full min-[700px]:translate-x-0'
        } ${
          !isExpanded && !isHovered ? 'min-[700px]:w-[72px]' : 'min-[700px]:w-[232px]'
        }`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => !isExpanded && setIsHovered(false)}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500">
              <span className="text-white font-bold text-xl">GG</span>
            </div>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="font-semibold text-gray-900" style={{ fontSize: '18px' }}>Admin Panel</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-50 text-brand-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${
                    !isExpanded && !isHovered && !isMobileOpen
                      ? 'justify-center'
                      : 'justify-start'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span style={{ fontSize: '14px' }}>{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors ${
              !isExpanded && !isHovered && !isMobileOpen
                ? 'justify-center'
                : 'justify-start'
            }`}
          >
            <span>←</span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span style={{ fontSize: '14px' }}>Back to Site</span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}

