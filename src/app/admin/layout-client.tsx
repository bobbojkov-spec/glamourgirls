'use client';

import { SidebarProvider, useSidebar } from '@/context-admin/SidebarContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Backdrop from '@/layout-admin/Backdrop';
import AntdProvider from '@/components/admin/AntdProvider';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import 'antd/dist/reset.css';

function MobileMenuButton() {
  const { toggleMobileSidebar, isMobileOpen } = useSidebar();

  return (
    <button
      onClick={toggleMobileSidebar}
      className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors max-[700px]:flex min-[700px]:hidden"
      aria-label="Toggle Menu"
    >
      {isMobileOpen ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 12H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 6H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 18H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const { isExpanded, isHovered } = useSidebar();

  // Login page should NOT show the admin chrome (sidebar/backdrop/mobile button).
  if (isLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center">
        <div className="w-full max-w-[520px] p-4 md:p-6">{children}</div>
      </div>
    );
  }

  // Calculate margin: sidebar collapsed (not expanded and not hovered) = 72px, else 232px
  // Initial state: isExpanded defaults to true, so margin starts at 232px (prevents layout shift)
  const mainContentMargin = (!isExpanded && !isHovered) 
    ? 'min-[700px]:ml-[72px]' 
    : 'min-[700px]:ml-[232px]';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - fixed positioned */}
      <AdminSidebar />
      <Backdrop />
      
      {/* Mobile Menu Button */}
      <MobileMenuButton />
      
      {/* Main Content Area - margin matches sidebar width, transitions smoothly */}
      <div className={`min-h-screen transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <div className="p-4 md:p-6 pt-16 max-[700px]:pt-20">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    // Hide content until fonts are ready to prevent FOUC
    if (typeof document !== 'undefined') {
      document.body.style.visibility = 'hidden';
      
      const loadFonts = async () => {
        try {
          await document.fonts.ready;
          // Small delay to ensure fonts are rendered
          setTimeout(() => {
            document.body.style.visibility = 'visible';
            setFontsReady(true);
          }, 50);
        } catch (error) {
          console.error('Error loading fonts:', error);
          // Fallback: show content after timeout if fonts fail
          setTimeout(() => {
            document.body.style.visibility = 'visible';
            setFontsReady(true);
          }, 500);
        }
      };
      
      loadFonts();
    }
  }, []);

  return (
    <AntdProvider>
      <SidebarProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </SidebarProvider>
    </AntdProvider>
  );
}
