import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Users from "./pages/Users";
import MediaTypes from "./pages/MediaTypes";
import Payments from "./pages/Payments";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import RegisterAdmin from "./pages/RegisterAdmin";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes - No Authentication Required */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes - Authentication Required */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/media-types" element={<MediaTypes />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/register-admin" element={<RegisterAdmin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
