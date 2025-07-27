import { useQuery } from "@tanstack/react-query";
import { DashboardCard } from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ShoppingBag,
  Users,
  Receipt,
  Package,
  CreditCard,
  ShoppingCart,
  Calendar as CalendarIcon,
  TrendingUp,
  CalendarDays,
  BarChart3,
  Star,
  User
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useMemo, useState } from "react";

// API function to fetch recent orders (auth required)
const fetchRecentOrders = async (token: string) => {
  const response = await fetch('/api/Order?PageNumber=1&PageSize=5', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication failed');
    }
    throw new Error('Failed to fetch recent orders');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return data.data.data;
  }
  
  return [];
};

// API function to fetch all orders for analytics (auth required)
const fetchOrdersAnalytics = async (token: string) => {
  const response = await fetch('/api/Order?PageNumber=1&PageSize=100', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication failed');
    }
    throw new Error('Failed to fetch orders for analytics');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return data.data.data;
  }
  
  return [];
};

// API function to fetch orders stats (auth required)
const fetchOrdersStats = async (token: string) => {
  const response = await fetch('/api/Order?PageNumber=1&PageSize=1', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch orders stats');
  }
  
  const data = await response.json();
  return data.data?.totalCount || 0;
};

// API function to fetch users stats (auth required)
const fetchUsersStats = async (token: string) => {
  const response = await fetch('/api/users?pageNumber=1&pageSize=1', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users stats');
  }
  
  const data = await response.json();
  return data.data?.totalCount || 0;
};

// API function to fetch products stats (no auth required, same as Products page)
const fetchProductsStats = async () => {
  const response = await fetch('/api/products/filter?pageNumber=1&pageSize=1');
  
  if (!response.ok) {
    throw new Error('Failed to fetch products stats');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.totalCount !== undefined) {
    return data.data.totalCount;
  }
  
  return 0;
};

// API function to fetch categories stats
const fetchCategoriesStats = async () => {
  const response = await fetch('/api/Category?PageNumber=1&PageSize=1');
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories stats');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.totalCount !== undefined) {
    return data.data.totalCount;
  }
  
  return 0;
};

// API function to fetch all categories for analytics
const fetchCategoriesAnalytics = async () => {
  const response = await fetch('/api/Category?PageNumber=1&PageSize=50');
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories for analytics');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return data.data.data;
  }
  
  return [];
};

// API function to fetch all products for analytics
const fetchProductsAnalytics = async () => {
  const response = await fetch('/api/products/filter?pageNumber=1&pageSize=100');
  
  if (!response.ok) {
    throw new Error('Failed to fetch products for analytics');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return data.data.data;
  }
  
  return [];
};

// Helper function to format date for chart
const formatDateForChart = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusConfig: { [key: string]: string } = {
    'تم الدفع': 'bg-blue-100 text-blue-800',
    'تم التوصيل': 'bg-green-100 text-green-800',
    'قيد التحضير': 'bg-yellow-100 text-yellow-800',
    'تم الإلغاء': 'bg-red-100 text-red-800',
    'قيد التوصيل': 'bg-indigo-100 text-indigo-800',
  };
  
  return statusConfig[status] || 'bg-gray-100 text-gray-800';
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const { data: totalOrders, isLoading: ordersStatsLoading, error: ordersStatsError } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required');
      }
      return fetchOrdersStats(user.token);
    },
    enabled: !!user?.token && isAuthenticated,
  });

  const { data: totalUsers, isLoading: usersStatsLoading, error: usersStatsError } = useQuery({
    queryKey: ['users-stats'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required');
      }
      return fetchUsersStats(user.token);
    },
    enabled: !!user?.token && isAuthenticated,
  });

  const { data: totalProducts, isLoading: productsStatsLoading, error: productsStatsError } = useQuery({
    queryKey: ['products-stats'],
    queryFn: fetchProductsStats,
  });

  const { data: totalCategories, isLoading: categoriesStatsLoading, error: categoriesStatsError } = useQuery({
    queryKey: ['categories-stats'],
    queryFn: fetchCategoriesStats,
  });

  const { data: categoriesAnalytics, isLoading: categoriesAnalyticsLoading, error: categoriesAnalyticsError } = useQuery({
    queryKey: ['categories-analytics'],
    queryFn: fetchCategoriesAnalytics,
  });

  const { data: productsAnalytics, isLoading: productsAnalyticsLoading, error: productsAnalyticsError } = useQuery({
    queryKey: ['products-analytics'],
    queryFn: fetchProductsAnalytics,
  });

  const { data: recentOrders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required');
      }
      return fetchRecentOrders(user.token);
    },
    enabled: !!user?.token && isAuthenticated,
  });

  const { data: ordersAnalytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['orders-analytics'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required');
      }
      return fetchOrdersAnalytics(user.token);
    },
    enabled: !!user?.token && isAuthenticated,
  });

  // Debug the data fetching
  console.log('🔍 Data fetching status:');
  console.log('🔍 User token:', user?.token ? 'Present' : 'Missing');
  console.log('🔍 Is authenticated:', isAuthenticated);
  console.log('🔍 Categories analytics data:', categoriesAnalytics);
  console.log('🔍 Categories analytics loading:', categoriesAnalyticsLoading);
  console.log('🔍 Categories analytics error:', categoriesAnalyticsError);
  console.log('🔍 Orders analytics data:', ordersAnalytics);
  console.log('🔍 Orders analytics loading:', analyticsLoading);
  console.log('🔍 Orders analytics error:', analyticsError);
  console.log('🔍 Products analytics data:', productsAnalytics);
  console.log('🔍 Products analytics error:', productsAnalyticsError);

  // Process orders data for line chart - group by date and count orders
  const lineData = useMemo(() => {
    if (!ordersAnalytics) return [];
    
    // Filter orders by date range if selected
    let filteredOrders = ordersAnalytics;
    if (dateRange.from || dateRange.to) {
      filteredOrders = ordersAnalytics.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        if (fromDate && toDate) {
          return orderDate >= fromDate && orderDate <= toDate;
        } else if (fromDate) {
          return orderDate >= fromDate;
        } else if (toDate) {
          return orderDate <= toDate;
        }
        return true;
      });
    }
    
    // Group orders by date
    const ordersByDate: { [key: string]: any[] } = {};
    
    filteredOrders.forEach((order: any) => {
      const date = new Date(order.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = [];
      }
      ordersByDate[dateKey].push(order);
    });
    
    // Convert to chart data
    return Object.entries(ordersByDate)
      .map(([dateKey, orders]) => {
        const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return {
          date: dateKey,
          dateFormatted: formatDateForChart(dateKey),
          orderCount: orders.length,
          totalAmount: totalAmount,
          orders: orders, // Keep reference for tooltip
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
  }, [ordersAnalytics, dateRange]);

  // Process categories data for pie chart - count orders by category
  const categoryAnalytics = useMemo(() => {
    console.log('🔍 Starting category analytics...');
    console.log('🔍 ordersAnalytics:', ordersAnalytics);
    console.log('🔍 categoriesAnalytics:', categoriesAnalytics);
    
    // Use fallback data if main analytics fail
    const orderData = ordersAnalytics || recentOrders || [];
    const categoryData = categoriesAnalytics || [];
    const productData = productsAnalytics || [];
    
    console.log('🔍 Using order data:', orderData);
    console.log('🔍 Using category data:', categoryData);
    console.log('🔍 Using product data:', productData);
    
    if (!orderData || orderData.length === 0) {
      console.log('❌ No order data available');
      return [];
    }
    
    // Count orders per category
    const categoryCounts: { [key: string]: { count: number; totalRevenue: number; name: string } } = {};
    
    orderData.forEach((order: any, orderIndex: number) => {
      console.log(`🔍 Processing order ${orderIndex + 1}:`, order);
      
      if (!order.items || !Array.isArray(order.items)) {
        console.log(`⚠️ Order ${orderIndex + 1} has no items or items is not an array:`, order.items);
        return;
      }
      
      if (order.items.length === 0) {
        console.log(`⚠️ Order ${orderIndex + 1} has empty items array`);
        return;
      }
      
      console.log(`🔍 Order ${orderIndex + 1} has ${order.items.length} items:`, order.items);
      
      order.items.forEach((item: any, itemIndex: number) => {
        // Show detailed structure for first item only to avoid spam
        if (orderIndex === 0 && itemIndex === 0) {
          console.log(`🔍 DETAILED ITEM STRUCTURE:`, JSON.stringify(item, null, 2));
          console.log(`🔍 Available fields:`, Object.keys(item));
        }
        
        // Try multiple approaches to find category information
        let categoryId = item.categoryId || item.CategoryId || item.category_id || item.Category?.id;
        let categoryName = item.categoryName || item.Category?.name;
        
        // If no direct category info, try to find it through product matching
        if (!categoryId && !categoryName && productData.length > 0) {
          const productName = item.name || item.productName;
          if (productName) {
            // Find matching product in products data
            const matchingProduct = productData.find((product: any) => 
              product.name === productName || 
              product.title === productName ||
              product.productName === productName
            );
            
            if (matchingProduct) {
              categoryId = matchingProduct.categoryId || matchingProduct.CategoryId || matchingProduct.category_id;
              console.log(`🔍 Found categoryId ${categoryId} for product ${productName} via product matching`);
            }
          }
        }
        
        if (orderIndex === 0 && itemIndex === 0) {
          console.log(`🔍 Found categoryId: ${categoryId}`);
          console.log(`🔍 Found categoryName: ${categoryName}`);
        }
        
        if (categoryId) {
          const category = categoryData.find((cat: any) => cat.id === categoryId);
          const finalCategoryName = category?.name || categoryName || 'Unknown Category';
          
          if (!categoryCounts[categoryId]) {
            categoryCounts[categoryId] = {
              count: 0,
              totalRevenue: 0,
              name: finalCategoryName
            };
          }
          
          categoryCounts[categoryId].count += item.quantity || 1;
          categoryCounts[categoryId].totalRevenue += item.totalPrice || (item.price * (item.quantity || 1)) || 0;
        } else if (categoryName) {
          // Use category name as fallback
          const fallbackId = `name_${categoryName}`;
          
          if (!categoryCounts[fallbackId]) {
            categoryCounts[fallbackId] = {
              count: 0,
              totalRevenue: 0,
              name: categoryName
            };
          }
          
          categoryCounts[fallbackId].count += item.quantity || 1;
          categoryCounts[fallbackId].totalRevenue += item.totalPrice || (item.price * (item.quantity || 1)) || 0;
        } else {
          // If we have categories but can't match items, create a category for each product
          const productName = item.name || item.productName || 'Unknown Product';
          
          // Try to intelligently assign to existing categories
          // For now, if we have categories available, distribute items among them
          if (categoryData.length > 0) {
            // Use the first category as default for unmatched items
            const defaultCategory = categoryData[0];
            const defaultCategoryId = defaultCategory.id;
            
            if (!categoryCounts[defaultCategoryId]) {
              categoryCounts[defaultCategoryId] = {
                count: 0,
                totalRevenue: 0,
                name: defaultCategory.name
              };
            }
            
            categoryCounts[defaultCategoryId].count += item.quantity || 1;
            categoryCounts[defaultCategoryId].totalRevenue += item.totalPrice || (item.price * (item.quantity || 1)) || 0;
          } else {
            // Last resort: group under product name
            const fallbackId = `product_${productName}`;
            
            if (!categoryCounts[fallbackId]) {
              categoryCounts[fallbackId] = {
                count: 0,
                totalRevenue: 0,
                name: productName
              };
            }
            
            categoryCounts[fallbackId].count += item.quantity || 1;
            categoryCounts[fallbackId].totalRevenue += item.totalPrice || (item.price * (item.quantity || 1)) || 0;
          }
        }
      });
    });
    
    console.log('🔍 Final category counts:', categoryCounts);
    
    const allCategories = Object.entries(categoryCounts)
      .map(([categoryId, data]) => ({
        categoryId,
        name: data.name,
        count: data.count,
        revenue: data.totalRevenue
      }))
      .sort((a, b) => b.count - a.count);
    
    const result = allCategories.slice(0, 5); // Top 5 categories
    
    console.log('🔍 Final category analytics result:', result);
    console.log(`🔍 Showing ${result.length} of ${allCategories.length} total categories`);
    
    return result;
  }, [ordersAnalytics, categoriesAnalytics, recentOrders, productsAnalytics]);

  // Process sellers data for chart - count orders by seller
  const sellerAnalytics = useMemo(() => {
    console.log('🔍 Starting seller analytics...');
    
    const orderData = ordersAnalytics || recentOrders || [];
    
    if (!orderData || orderData.length === 0) {
      console.log('❌ No order data available for sellers');
      return [];
    }
    
    const sellerCounts: { [key: string]: { count: number; totalRevenue: number; name: string } } = {};
    
    orderData.forEach((order: any) => {
      const sellerId = order.sellerId || order.SellerId || 'unknown';
      const sellerName = order.sellerName || order.SellerName || 'Unknown Seller';
      
      if (!sellerCounts[sellerId]) {
        sellerCounts[sellerId] = {
          count: 0,
          totalRevenue: 0,
          name: sellerName
        };
      }
      
      sellerCounts[sellerId].count += 1;
      sellerCounts[sellerId].totalRevenue += order.totalAmount || 0;
    });
    
    console.log('🔍 Seller counts:', sellerCounts);
    
    const result = Object.entries(sellerCounts)
      .map(([sellerId, data]) => ({
        sellerId,
        name: data.name,
        count: data.count,
        revenue: data.totalRevenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 sellers
    
    console.log('🔍 Final seller analytics result:', result);
    return result;
  }, [ordersAnalytics, recentOrders]);

  // Process customers data for chart - count orders by customer
  const customerAnalytics = useMemo(() => {
    console.log('🔍 Starting customer analytics...');
    
    const orderData = ordersAnalytics || recentOrders || [];
    
    if (!orderData || orderData.length === 0) {
      console.log('❌ No order data available for customers');
      return [];
    }
    
    const customerCounts: { [key: string]: { count: number; totalRevenue: number; name: string } } = {};
    
    orderData.forEach((order: any) => {
      const customerId = order.customerId || order.CustomerId || 'unknown';
      const customerName = order.customerName || order.CustomerName || 'Unknown Customer';
      
      if (!customerCounts[customerId]) {
        customerCounts[customerId] = {
          count: 0,
          totalRevenue: 0,
          name: customerName
        };
      }
      
      customerCounts[customerId].count += 1;
      customerCounts[customerId].totalRevenue += order.totalAmount || 0;
    });
    
    console.log('🔍 Customer counts:', customerCounts);
    
    const result = Object.entries(customerCounts)
      .map(([customerId, data]) => ({
        customerId,
        name: data.name,
        count: data.count,
        revenue: data.totalRevenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 customers
    
    console.log('🔍 Final customer analytics result:', result);
    return result;
  }, [ordersAnalytics, recentOrders]);

  // Process products data for most ordered
  const mostOrderedProducts = useMemo(() => {
    console.log('🔍 Starting product analytics...');
    
    // Use fallback data if main analytics fail
    const orderData = ordersAnalytics || recentOrders || [];
    
    console.log('🔍 Using order data for products:', orderData);
    
    if (!orderData || orderData.length === 0) {
      console.log('❌ No order data available for products');
      return [];
    }
    
    const productCounts: { [key: string]: { orderIds: Set<string>; totalRevenue: number; product: any; totalQuantity: number } } = {};
    
    orderData.forEach((order: any, orderIndex: number) => {
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        return;
      }
      
      const orderId = order.id || `order_${orderIndex}`;
      
      order.items.forEach((item: any, itemIndex: number) => {
        // Show detailed structure for first item only to avoid spam
        if (orderIndex === 0 && itemIndex === 0) {
          console.log(`🔍 DETAILED PRODUCT ITEM:`, JSON.stringify(item, null, 2));
        }
        
        // Try different possible field names for product
        const productId = item.productId || item.ProductId || item.product_id || item.id;
        const productName = item.name || item.productName || item.Product?.name || 'Unknown Product';
        
        if (orderIndex === 0 && itemIndex === 0) {
          console.log(`🔍 Found productId: ${productId}, name: ${productName}`);
        }
        
        if (productId || productName !== 'Unknown Product') {
          const key = productId || `name_${productName}`;
          
          if (!productCounts[key]) {
            productCounts[key] = {
              orderIds: new Set<string>(),
              totalRevenue: 0,
              product: item,
              totalQuantity: 0
            };
          }
          
          // Add this order ID to the set (automatically handles duplicates)
          productCounts[key].orderIds.add(orderId);
          productCounts[key].totalRevenue += item.totalPrice || (item.price * (item.quantity || 1)) || 0;
          productCounts[key].totalQuantity += item.quantity || 1;
        }
      });
    });
    
    console.log('🔍 Final product counts:', productCounts);
    
    const allProducts = Object.entries(productCounts)
      .map(([productId, data]) => ({
        productId,
        name: data.product.name || data.product.productName || data.product.Product?.name || 'Unknown Product',
        orderCount: data.orderIds.size, // Number of unique orders
        totalQuantity: data.totalQuantity, // Total quantity across all orders
        revenue: data.totalRevenue,
        price: data.product.price || 0,
        imageUrl: data.product.imageUrl || data.product.image
      }))
      .sort((a, b) => b.orderCount - a.orderCount); // Sort by number of orders, not quantity
    
    const result = allProducts.slice(0, 5); // Top 5 products
    
    console.log('🔍 Final product analytics result:', result);
    console.log(`🔍 Showing ${result.length} of ${allProducts.length} total products (sorted by order frequency)`);
    
    return result;
  }, [ordersAnalytics, productsAnalytics, recentOrders]);

  // Colors for pie chart
  const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const isLoading = ordersStatsLoading || usersStatsLoading || productsStatsLoading || categoriesStatsLoading || categoriesAnalyticsLoading || productsAnalyticsLoading || ordersLoading || analyticsLoading;

  if (!isAuthenticated || !user?.token) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your e-commerce store</p>
          </div>
        </div>
        <Card className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Authentication Required</h3>
          <p className="text-muted-foreground mt-2">
            Please log in to view dashboard.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your e-commerce store</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your e-commerce store</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-sm font-medium">{new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Orders"
          value={totalOrders?.toLocaleString() || '0'}
          description="Total orders placed"
          icon={<Receipt className="text-primary" size={20} />}
          trend={{
            value: 0,
            isPositive: true
          }}
        />
        <DashboardCard
          title="Total Users"
          value={totalUsers?.toLocaleString() || '0'}
          description="Registered customers"
          icon={<Users className="text-primary" size={20} />}
          trend={{
            value: 0,
            isPositive: true
          }}
        />
        <DashboardCard
          title="Total Products"
          value={totalProducts?.toLocaleString() || '0'}
          description="Products in catalog"
          icon={<Package className="text-primary" size={20} />}
          trend={{
            value: 0,
            isPositive: true
          }}
        />
        <DashboardCard
          title="Total Categories"
          value={totalCategories?.toLocaleString() || '0'}
          description="Product categories"
          icon={<ShoppingBag className="text-primary" size={20} />}
          trend={{
            value: 0,
            isPositive: true
          }}
        />
      </div>

      {/* Orders Chart */}
      <Card className="shadow-admin-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="text-primary" size={20} />
                Orders Count Over Time
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Line chart showing daily order counts
                {dateRange.from && dateRange.to && (
                  <span className="block mt-1 text-primary">
                    Filtered: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: undefined, to: undefined })}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsError ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="mx-auto h-8 w-8 mb-2" />
                <p>Failed to load chart data</p>
              </div>
            </div>
          ) : lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#94a3b8"
                />
                <YAxis 
                  label={{ value: 'Orders', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-foreground mb-2">{label}</p>
                          <div className="space-y-1">
                            <p className="text-sm">📦 Orders: <span className="font-medium">{data.orderCount}</span></p>
                            <p className="text-sm">💰 Total: <span className="font-medium">${data.totalAmount.toLocaleString()}</span></p>
                            <p className="text-sm">📊 Avg/Order: <span className="font-medium">${(data.totalAmount / data.orderCount).toFixed(2)}</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orderCount" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="mx-auto h-8 w-8 mb-2" />
                <p>No order data available for selected date range</p>
                {(dateRange.from || dateRange.to) && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                    className="mt-2"
                  >
                    Clear filters to see all data
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="shadow-admin-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="text-primary" size={20} />
            Recent Orders
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest orders from customers
          </p>
        </CardHeader>
        <CardContent>
          {ordersError ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="mx-auto h-8 w-8 mb-2" />
              <p>Failed to load recent orders</p>
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.customerName || 'Unknown Customer'}</p>
                      <div className={`px-2 py-1 rounded text-xs ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon size={12} />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length || 0} items • {order.sellerName}
                    </p>
                    <div className="text-right">
                      <p className="font-semibold text-lg text-primary">${order.totalAmount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="mx-auto h-8 w-8 mb-2" />
              <p>No recent orders</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
                 {/* Category Sales Analysis */}
         <Card className="shadow-admin-md">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <BarChart3 className="text-primary" size={20} />
               Top Selling Categories
             </CardTitle>
             <p className="text-sm text-muted-foreground">
               Top categories ranked by sales volume and revenue
             </p>
           </CardHeader>
           <CardContent>
             {categoriesAnalyticsError ? (
               <div className="h-80 flex items-center justify-center text-muted-foreground">
                 <div className="text-center">
                   <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                   <p>Failed to load category data</p>
                 </div>
               </div>
             ) : categoryAnalytics.length > 0 ? (
               <>
                 <ResponsiveContainer width="100%" height={400}>
                   <BarChart data={categoryAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                     <XAxis 
                       dataKey="name" 
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       angle={-45}
                       textAnchor="end"
                       height={80}
                       stroke="#94a3b8"
                     />
                     <YAxis 
                       label={{ value: 'Items Sold', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       stroke="#94a3b8"
                     />
                     <Tooltip
                       content={({ active, payload, label }) => {
                         if (active && payload && payload[0]) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-background border rounded-lg p-4 shadow-lg">
                               <p className="font-semibold text-foreground mb-2">{label}</p>
                               <div className="space-y-1">
                                 <p className="text-sm">📦 Items Sold: <span className="font-medium">{data.count.toLocaleString()}</span></p>
                                 <p className="text-sm">💰 Revenue: <span className="font-medium">${data.revenue.toLocaleString()}</span></p>
                                 <p className="text-sm">📊 Avg per Item: <span className="font-medium">${(data.revenue / data.count).toFixed(2)}</span></p>
                               </div>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                     <Bar 
                       dataKey="count" 
                       fill="#3b82f6"
                       radius={[4, 4, 0, 0]}
                     />
                   </BarChart>
                 </ResponsiveContainer>
                 {/* Show note if there are more categories than displayed */}
                 {categoriesAnalytics && categoriesAnalytics.length > 5 && (
                   <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                     <p className="text-sm text-blue-700">
                       📊 Showing top 5 categories. You have {categoriesAnalytics.length} total categories in your system.
                     </p>
                   </div>
                 )}
               </>
             ) : (
               <div className="h-80 flex items-center justify-center text-muted-foreground">
                 <div className="text-center">
                   <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                   <p>No category data available</p>
                   <p className="text-xs mt-2">Items will be grouped by category when product categories are assigned</p>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>

        {/* Most Ordered Products */}
        <Card className="shadow-admin-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="text-primary" size={20} />
              Top Products in Most Orders
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Top products that appear in the most orders
            </p>
          </CardHeader>
          <CardContent>
            {productsAnalyticsError ? (
              <div className="text-center text-muted-foreground py-8">
                <Star className="mx-auto h-8 w-8 mb-2" />
                <p>Failed to load product data</p>
              </div>
            ) : mostOrderedProducts.length > 0 ? (
              <>
                <div className="space-y-4">
                  {mostOrderedProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                      {/* Ranking */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${product.imageUrl ? 'hidden' : ''}`}>
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>📋 Orders: {product.orderCount}</span>
                          <span>📦 Total Qty: {product.totalQuantity}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>💰 Revenue: ${product.revenue.toLocaleString()}</span>
                          <span>💵 Price: ${product.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Show note if there are more products than displayed */}
                {mostOrderedProducts.length >= 5 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      📊 Showing top 5 products. Check your products page to see all available products.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Star className="mx-auto h-8 w-8 mb-2" />
                <p>No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>
       </div>

       {/* User Analytics Grid */}
       <div className="grid gap-6 lg:grid-cols-2">
         {/* Top Sellers Chart */}
         <Card className="shadow-admin-md">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Users className="text-primary" size={20} />
               Top 5 Active Sellers
             </CardTitle>
             <p className="text-sm text-muted-foreground">
               Sellers ranked by number of orders completed
             </p>
           </CardHeader>
           <CardContent>
             {sellerAnalytics.length > 0 ? (
               <>
                 <ResponsiveContainer width="100%" height={400}>
                   <BarChart data={sellerAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                     <XAxis 
                       dataKey="name" 
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       angle={-45}
                       textAnchor="end"
                       height={80}
                       stroke="#94a3b8"
                     />
                     <YAxis 
                       label={{ value: 'Orders Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       stroke="#94a3b8"
                     />
                     <Tooltip
                       content={({ active, payload, label }) => {
                         if (active && payload && payload[0]) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-background border rounded-lg p-4 shadow-lg">
                               <p className="font-semibold text-foreground mb-2">{label}</p>
                               <div className="space-y-1">
                                 <p className="text-sm">📦 Orders: <span className="font-medium">{data.count}</span></p>
                                 <p className="text-sm">💰 Revenue: <span className="font-medium">${data.revenue.toLocaleString()}</span></p>
                                 <p className="text-sm">📊 Avg per Order: <span className="font-medium">${(data.revenue / data.count).toFixed(2)}</span></p>
                               </div>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                     <Bar 
                       dataKey="count" 
                       fill="#10b981"
                       radius={[4, 4, 0, 0]}
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </>
             ) : (
               <div className="h-80 flex items-center justify-center text-muted-foreground">
                 <div className="text-center">
                   <Users className="mx-auto h-8 w-8 mb-2" />
                   <p>No seller data available</p>
                   <p className="text-xs mt-2">Sellers will appear when orders are processed</p>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>

         {/* Top Customers Chart */}
         <Card className="shadow-admin-md">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <User className="text-primary" size={20} />
               Top 5 Active Customers
             </CardTitle>
             <p className="text-sm text-muted-foreground">
               Customers ranked by number of orders placed
             </p>
           </CardHeader>
           <CardContent>
             {customerAnalytics.length > 0 ? (
               <>
                 <ResponsiveContainer width="100%" height={400}>
                   <BarChart data={customerAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                     <XAxis 
                       dataKey="name" 
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       angle={-45}
                       textAnchor="end"
                       height={80}
                       stroke="#94a3b8"
                     />
                     <YAxis 
                       label={{ value: 'Orders Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                       tick={{ fontSize: 11, fill: '#64748b' }}
                       stroke="#94a3b8"
                     />
                     <Tooltip
                       content={({ active, payload, label }) => {
                         if (active && payload && payload[0]) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-background border rounded-lg p-4 shadow-lg">
                               <p className="font-semibold text-foreground mb-2">{label}</p>
                               <div className="space-y-1">
                                 <p className="text-sm">📦 Orders: <span className="font-medium">{data.count}</span></p>
                                 <p className="text-sm">💰 Spent: <span className="font-medium">${data.revenue.toLocaleString()}</span></p>
                                 <p className="text-sm">📊 Avg per Order: <span className="font-medium">${(data.revenue / data.count).toFixed(2)}</span></p>
                               </div>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                     <Bar 
                       dataKey="count" 
                       fill="#f59e0b"
                       radius={[4, 4, 0, 0]}
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </>
             ) : (
               <div className="h-80 flex items-center justify-center text-muted-foreground">
                 <div className="text-center">
                   <User className="mx-auto h-8 w-8 mb-2" />
                   <p>No customer data available</p>
                   <p className="text-xs mt-2">Customers will appear when orders are placed</p>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
       </div>

       {/* Analytics Info */}
       <Card className="shadow-admin-md bg-blue-50/50 border-blue-200">
         <CardContent className="p-4">
           <div className="flex items-start gap-3">
             <div className="bg-blue-100 p-2 rounded-full">
               <TrendingUp className="w-4 h-4 text-blue-600" />
             </div>
             <div>
               <h4 className="font-medium text-blue-900 mb-1">Analytics Summary</h4>
               <div className="text-sm text-blue-700 space-y-1">
                 <p>📊 <strong>Total Orders:</strong> {totalOrders} orders placed</p>
                 <p>📦 <strong>Total Items Sold:</strong> {categoryAnalytics.reduce((sum, cat) => sum + cat.count, 0)} individual items</p>
                 <p>💰 <strong>Total Revenue:</strong> ${categoryAnalytics.reduce((sum, cat) => sum + cat.revenue, 0).toLocaleString()}</p>
                 <p className="text-xs mt-2 text-blue-600">
                   💡 Category chart shows <em>item quantities</em> • Product ranking shows <em>order frequency</em>
                 </p>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
  );
}