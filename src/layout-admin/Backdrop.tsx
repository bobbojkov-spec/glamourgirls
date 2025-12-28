import { useSidebar } from "@/context-admin/SidebarContext";
import React from "react";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 max-[768px]:block hidden"
      onClick={toggleMobileSidebar}
    />
  );
};

export default Backdrop;
