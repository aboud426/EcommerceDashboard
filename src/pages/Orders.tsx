import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Eye, 
  Calendar, 
  User, 
  CreditCard, 
  Package, 
  Search, 
  Hash,
  ShoppingBag,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// API function to fetch orders (auth required)
const fetchOrders = async (token: string) => {
  console.log('🔐 Attempting to fetch orders with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch('/api/Order?PageNumber=1&PageSize=50', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('📊 Orders API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Orders API Error Response:', responseText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please log out and log in again.');
    }
    
    throw new Error(`Failed to fetch orders (${response.status})`);
  }
  
  const data = await response.json();
  console.log('✅ Orders fetched successfully:', data);
  
  if (data.success && data.data && data.data.data) {
    return {
      orders: data.data.data,
      pagination: {
        pageNumber: data.data.pageNumber,
        pageSize: data.data.pageSize,
        totalPages: data.data.totalPages,
        totalCount: data.data.totalCount,
        hasPreviousPage: data.data.hasPreviousPage,
        hasNextPage: data.data.hasNextPage,
      }
    };
  }
  
  return { orders: [], pagination: null };
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format date and time
const formatDateTime = (dateString: string) => {
  if (!dateString || dateString === "0001-01-01T00:00:00") {
    return "Date not recorded";
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleString();
  } catch (error) {
    return "Invalid date";
  }
};

// Helper function to get product image URL
const getProductImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  
  // The imageUrl from API looks like "/media/products/images/filename.png"
  // Remove leading slash if present since we want relative URL
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
  
  // Return as relative URL to API
  return `/${cleanPath}`;
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { user, isAuthenticated } = useAuth();

  // Rotating search placeholders
  const searchPlaceholders = [
    "Search by order status...",
    "Search by customer name...",
    "Search by seller name...",
    "Search by payment method...",
    "Search by amount...",
  ];

  // Animate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, [searchPlaceholders.length]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return fetchOrders(user.token);
    },
    enabled: !!user?.token && isAuthenticated,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    
    return orders.filter((order: any) =>
      order.orderStatus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentMethodName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.totalAmount?.toString().includes(searchTerm)
    );
  }, [orders, searchTerm]);

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    // Handle Arabic statuses
    const statusConfig: { [key: string]: { className: string } } = {
      'تم الدفع': { className: "bg-blue-100 text-blue-800" },
      'تم التوصيل': { className: "bg-green-100 text-green-800" },
      'قيد التحضير': { className: "bg-yellow-100 text-yellow-800" },
      'تم الإلغاء': { className: "bg-red-100 text-red-800" },
      'قيد التوصيل': { className: "bg-indigo-100 text-indigo-800" },
      // English fallbacks
      'paid': { className: "bg-blue-100 text-blue-800" },
      'delivered': { className: "bg-green-100 text-green-800" },
      'preparing': { className: "bg-yellow-100 text-yellow-800" },
      'cancelled': { className: "bg-red-100 text-red-800" },
      'shipping': { className: "bg-indigo-100 text-indigo-800" },
    };
    
    const config = statusConfig[status] || statusConfig[status.toLowerCase()] || { className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{status}</Badge>;
  };

  if (!isAuthenticated || !user?.token) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">View and manage customer orders</p>
          </div>
        </div>
        <Card className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Authentication Required</h3>
          <p className="text-muted-foreground mt-2">
            Please log in to view orders.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">View and manage customer orders</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-40"></div>
                  <div className="h-4 bg-muted rounded w-64"></div>
                  <div className="h-4 bg-muted rounded w-48"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">View and manage customer orders</p>
          </div>
        </div>
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium text-destructive">Error loading orders</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: /api/Order
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Please ensure the API server is running and try again.
          </p>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">
            View and manage customer orders
            {pagination && (
              <span className="block sm:inline sm:ml-2">
                • {pagination.totalCount} total orders
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder={searchPlaceholders[placeholderIndex]}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transition-all duration-300"
          />
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center border rounded-lg p-1 bg-muted/30">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-8 px-3"
          >
            <LayoutGrid size={16} className="mr-1" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 px-3"
          >
            <TableIcon size={16} className="mr-1" />
            Table
          </Button>
        </div>
      </div>

      {filteredOrders && filteredOrders.length > 0 ? (
        <>
          {viewMode === 'cards' ? (
            // Cards View
            <div className="space-y-4">
              {filteredOrders.map((order: any) => (
                <Card key={order.id} className="shadow-admin-md hover:shadow-admin-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {/* Order Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="text-primary" size={16} />
                          <h3 className="font-semibold text-sm">
                            Order Details
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar size={14} />
                            <span>Created: {formatDate(order.createdAt)}</span>
                          </div>
                          {order.updatedAt && order.updatedAt !== order.createdAt && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar size={14} />
                              <span>Updated: {formatDate(order.updatedAt)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.orderStatus || 'Unknown')}
                          <span className="text-lg font-semibold text-primary">
                            ${order.totalAmount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Seller Info */}
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <User className="text-primary" size={16} />
                          People & Payment
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <div className="font-medium mt-1">
                              {order.customerName || 'Unknown Customer'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Seller:</span>
                            <div className="font-medium mt-1">
                              {order.sellerName || 'Unknown Seller'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Payment Method:</span>
                            <div className="font-medium mt-1 flex items-center gap-2">
                              <CreditCard size={14} />
                              {order.paymentMethodName || order.paymentMethod || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items Count:</span>
                            <span className="ml-1">
                              {order.items?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions section removed */}
                    </div>

                    {/* Order Items Preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-medium text-sm mb-2">Order Items ({order.items.length})</h5>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                              {/* Product Image */}
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={getProductImageUrl(item.imageUrl)}
                                    alt={item.name || 'Product'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                              
                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {item.name || 'Unknown Product'}
                                </div>
                                <div className="text-muted-foreground">
                                  Qty: {item.quantity || 0} × ${item.price || 0} = ${item.totalPrice || 0}
                                </div>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{order.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Table View
            <Card className="shadow-admin-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order: any) => (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <Hash size={12} />
                              {order.id?.substring(0, 8) || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-muted-foreground" />
                              <span className="font-medium">
                                {order.customerName || 'Unknown Customer'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ShoppingBag size={14} className="text-muted-foreground" />
                              <span>
                                {order.sellerName || 'Unknown Seller'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.orderStatus || 'Unknown')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Package size={14} className="text-muted-foreground" />
                              <span>{order.items?.length || 0}</span>
                              {order.items && order.items.length > 0 && (
                                <div className="text-xs text-muted-foreground ml-1">
                                  ({order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} units)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CreditCard size={14} className="text-muted-foreground" />
                              <span className="text-xs">
                                {order.paymentMethodName || order.paymentMethod || 'Not specified'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar size={14} className="text-muted-foreground" />
                              <span className="text-xs">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-primary">
                              ${order.totalAmount || 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">
            {searchTerm ? 'No orders found' : 'No orders available'}
          </h3>
          <p className="text-muted-foreground mt-2">
            {searchTerm 
              ? `No orders found matching "${searchTerm}". Try a different search term.`
              : 'No orders have been placed yet.'
            }
          </p>
        </Card>
      )}

      {/* Pagination info */}
      {pagination && pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Page {pagination.pageNumber} of {pagination.totalPages}
            </span>
            <span>
              Showing {filteredOrders.length} of {pagination.totalCount} orders
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}