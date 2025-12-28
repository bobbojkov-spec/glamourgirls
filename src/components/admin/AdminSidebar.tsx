'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context-admin/SidebarContext';
import { Menu, MenuProps } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  DollarOutlined, 
  EyeOutlined,
  TeamOutlined,
  StarOutlined,
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/admin/girls',
    icon: <UserOutlined />,
    label: 'Girls Database',
  },
  {
    key: '/admin/featured-actresses',
    icon: <StarOutlined />,
    label: 'Featured Actresses',
  },
  {
    key: '/admin/users/admins',
    icon: <TeamOutlined />,
    label: 'Users',
  },
  {
    key: '/admin/sales',
    icon: <DollarOutlined />,
    label: 'Sales Stats',
  },
  {
    key: '/admin/girls-stats',
    icon: <EyeOutlined />,
    label: 'Girls Stats',
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
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  // Determine selected key
  const selectedKey = menuItems.find(item => {
    const key = item?.key as string;
    if (key === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(key);
  })?.key as string || '/admin';

  // Handle menu click - use router for navigation
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key as string);
  };

  // Collapsed state: when not expanded and not hovered (on desktop)
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  // Sidebar width: 200px expanded, 64px collapsed (Ant Design standard)
  const sidebarWidth = isCollapsed ? 64 : 200;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full min-[768px]:translate-x-0'
      }`}
      style={{ width: `${sidebarWidth}px` }}
      onMouseEnter={() => !isExpanded && !isMobileOpen && setIsHovered(true)}
      onMouseLeave={() => !isExpanded && !isMobileOpen && setIsHovered(false)}
    >
      {/* Logo and Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <Link href="/admin" className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 flex-shrink-0">
            <span className="text-white font-bold text-sm">GG</span>
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-gray-900 text-sm truncate">Admin</span>
          )}
        </Link>
        {!isMobileOpen && (
          <button
            onClick={toggleSidebar}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 transition-colors flex-shrink-0 min-[768px]:flex hidden"
            aria-label="Toggle sidebar"
          >
            {isExpanded ? (
              <MenuFoldOutlined className="text-gray-600" />
            ) : (
              <MenuUnfoldOutlined className="text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          inlineCollapsed={isCollapsed}
          style={{
            borderRight: 0,
            height: '100%',
          }}
          className="border-r-0"
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-2">
        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <ArrowLeftOutlined className="text-sm" />
          {!isCollapsed && (
            <span className="text-sm">Back to Site</span>
          )}
        </Link>
      </div>
    </aside>
  );
}

