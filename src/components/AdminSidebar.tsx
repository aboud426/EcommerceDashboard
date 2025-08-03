import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  FileImage,
  Users,
  Receipt,
  ShoppingBag,
  Menu,
  X,
  LogOut,
  User,
  UserPlus,

} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Categories", url: "/categories", icon: Package },
  { title: "Payment Methods", url: "/payments", icon: CreditCard },
  { title: "Media Types", url: "/media-types", icon: FileImage },
  { title: "Users", url: "/users", icon: Users },
  { title: "Orders", url: "/orders", icon: Receipt },
  { title: "Products", url: "/products", icon: ShoppingBag },
  { title: "Register Admin", url: "/register-admin", icon: UserPlus },
];

// Helper function to get profile photo URL
const getProfilePhotoUrl = (profilePhoto: string | null) => {
  if (!profilePhoto) return null;
  const cleanPath = profilePhoto.startsWith('/') ? profilePhoto.substring(1) : profilePhoto;
  return `/api/files/${cleanPath}`;
};

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const { logout, user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
      "hover:bg-accent hover:text-accent-foreground",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
      isActive(path)
        ? "bg-primary text-primary-foreground shadow-admin-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="fixed top-2 left-2 z-50 p-2 rounded-lg bg-card border border-border shadow-admin-sm lg:hidden"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          "lg:translate-x-0 lg:block flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <ShoppingBag className="text-primary-foreground" size={20} />
                </div>
                <span className="font-semibold text-lg">E-Store Admin</span>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
            {navigationItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={getNavClasses(item.url)}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer - Always visible */}
          <div className="flex-shrink-0 p-3 border-t border-border space-y-3">
            {!isCollapsed && user && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-background border">
                  {user.profilePhoto ? (
                    <img
                      src={getProfilePhotoUrl(user.profilePhoto) || undefined}
                      alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={user.profilePhoto ? "hidden" : ""}>
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.lastName || 'Admin User'
                    }
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email || user.phone}
                  </div>
                </div>
              </div>
            )}
            {isCollapsed && user && (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-background border">
                  {user.profilePhoto ? (
                    <img
                      src={getProfilePhotoUrl(user.profilePhoto) || undefined}
                      alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={user.profilePhoto ? "hidden" : ""}>
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
            <Button
              onClick={logout}
              variant="outline"
              size={isCollapsed ? "icon" : "sm"}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut size={16} className="flex-shrink-0" />
              {!isCollapsed && <span className="ml-2">Logout</span>}
            </Button>
            {!isCollapsed && (
              <div className="text-xs text-muted-foreground text-center">
                Admin Panel v1.0
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}