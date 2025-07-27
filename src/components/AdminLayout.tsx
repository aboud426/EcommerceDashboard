import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="transition-all duration-300 lg:ml-64">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}