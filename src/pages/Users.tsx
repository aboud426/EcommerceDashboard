import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, Star, MessageCircle, Search, ShoppingCart, Package, Eye, Receipt, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

// Custom hook for debouncing values
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// API function to fetch users (auth required)
const fetchUsers = async (searchName?: string, token?: string) => {
  let url = '/api/users?pageNumber=1&pageSize=10';
  
  // Use search endpoint if search term is provided
  if (searchName && searchName.trim()) {
    url = `/api/users/search?name=${encodeURIComponent(searchName.trim())}&pageNumber=1&pageSize=10`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw new Error('Failed to fetch users');
  }
  
  const data = await response.json();
  
  // Extract the users array from the nested response structure
  if (data.success && data.data && data.data.data) {
    return {
      users: data.data.data,
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
  
  return { users: [], pagination: null };
};

// API function to fetch user cart (auth required)
const fetchUserCart = async (userId: string, token: string) => {
  console.log('🛒 Attempting to fetch user cart for userId:', userId);
  console.log('🔗 Cart API endpoint: /api/Cart/by-user/' + userId);
  
  const response = await fetch(`/api/Cart/by-user/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('📊 Cart API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Cart API Error Response:', responseText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed');
    }
    if (response.status === 404) {
      throw new Error('Cart not found for this user or endpoint not available');
    }
    throw new Error(`Failed to fetch user cart (${response.status})`);
  }
  
  const data = await response.json();
  console.log('✅ Cart fetched successfully:', data);
  
  // Handle the specific response structure for user cart API
  if (data.success && data.data) {
    return {
      id: data.data.id,
      userId: data.data.userId,
      createdAt: data.data.createdAt,
      updatedAt: data.data.updatedAt,
      items: data.data.cartItemsWithDetails || []
    };
  }
  
  return { id: null, userId: null, createdAt: null, updatedAt: null, items: [] };
};

// API function to fetch user orders (auth required)
const fetchUserOrders = async (userId: string, token: string) => {
  console.log('📦 Attempting to fetch user orders for userId:', userId);
  console.log('🔗 Orders API endpoint: /api/Order/by-user/' + userId);
  
  const response = await fetch(`/api/Order/by-user/${userId}?PageNumber=1&PageSize=20`, {
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
      throw new Error('Authentication failed');
    }
    if (response.status === 404) {
      throw new Error('Orders not found for this user or endpoint not available');
    }
    throw new Error(`Failed to fetch user orders (${response.status})`);
  }
  
  const data = await response.json();
  console.log('✅ Orders fetched successfully:', data);
  
  // Handle the specific response structure for user orders API
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

// Helper function to get full name
const getFullName = (user: any) => {
  const fullName = `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim();
  return fullName || 'Unknown User';
};

// Helper function to get profile photo URL using the new files endpoint
const getProfilePhotoUrl = (profilePhoto: string | null) => {
  if (!profilePhoto) return null;
  // Clean the file path - remove leading slash if present
  const cleanPath = profilePhoto.startsWith('/') ? profilePhoto.substring(1) : profilePhoto;
  return `/api/files/${cleanPath}`;
};

export default function Users() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserForOrders, setSelectedUserForOrders] = useState<any>(null);
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Debounce search term to prevent API calls on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', debouncedSearchTerm],
    queryFn: () => {
      console.log('🔄 useQuery fetchUsers called');
      console.log('👤 Current user state:', { 
        hasUser: !!user, 
        hasToken: !!user?.token, 
        userEmail: user?.email 
      });
      
      if (!user?.token) {
        console.error('❌ No authentication token available');
        throw new Error('Authentication required to fetch users');
      }
      return fetchUsers(debouncedSearchTerm, user.token);
    },

    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
    enabled: !!user?.token, // Only run query if user is authenticated
  });

  // Query for user cart (only when modal is open and user is selected)
  const { data: cartData, isLoading: isCartLoading, error: cartError } = useQuery({
    queryKey: ['userCart', selectedUser?.id],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required to view cart');
      }
      return fetchUserCart(selectedUser.id, user.token);
    },
    enabled: !!selectedUser && isCartModalOpen && !!user?.token,
  });

  // Query for user orders (only when modal is open and user is selected)
  const { data: ordersData, isLoading: isOrdersLoading, error: ordersError } = useQuery({
    queryKey: ['userOrders', selectedUserForOrders?.id],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required to view orders');
      }
      return fetchUserOrders(selectedUserForOrders.id, user.token);
    },
    enabled: !!selectedUserForOrders && isOrdersModalOpen && !!user?.token,
  });

  const users: any[] = data?.users || [];
  const pagination = data?.pagination;

  // Memoize users and pagination to prevent unnecessary re-renders
  const memoizedUsers = useMemo(() => data?.users || [], [data?.users]);
  const memoizedPagination = useMemo(() => data?.pagination, [data?.pagination]);

  // Handle view cart button click
  const handleViewCart = (user: any) => {
    setSelectedUser(user);
    setIsCartModalOpen(true);
  };

  // Handle cart modal close
  const handleCloseCartModal = () => {
    setIsCartModalOpen(false);
    setSelectedUser(null);
    // Clear cart data from cache when closing
    if (selectedUser) {
      queryClient.removeQueries({ queryKey: ['userCart', selectedUser.id] });
    }
  };

  // Handle view orders button click
  const handleViewOrders = (user: any) => {
    setSelectedUserForOrders(user);
    setIsOrdersModalOpen(true);
  };

  // Handle orders modal close
  const handleCloseOrdersModal = () => {
    setIsOrdersModalOpen(false);
    setSelectedUserForOrders(null);
    // Clear orders data from cache when closing
    if (selectedUserForOrders) {
      queryClient.removeQueries({ queryKey: ['userOrders', selectedUserForOrders.id] });
    }
  };

  // Maintain search input focus during re-renders
  useEffect(() => {
    if (searchInputRef.current && searchTerm && document.activeElement !== searchInputRef.current) {
      const shouldRefocus = searchInputRef.current.contains(document.activeElement) || 
                           document.activeElement === document.body;
      if (shouldRefocus) {
        searchInputRef.current.focus();
        // Restore cursor position for better UX
        const length = searchTerm.length;
        searchInputRef.current.setSelectionRange(length, length);
      }
    }
  }, [memoizedUsers, searchTerm]); // Re-run when memoized users data or search term changes

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="flex items-center gap-3">
          <Search size={20} className="text-muted-foreground" />
          <div className="space-y-2 flex-1 max-w-md">
            <div className="h-4 bg-muted rounded w-16"></div>
            <div className="h-9 bg-muted rounded w-full"></div>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-40 mb-2"></div>
                <div className="h-4 bg-muted rounded w-64 mb-2"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">View registered users</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <Search size={20} className="text-muted-foreground" />
          <div className="space-y-2 flex-1 max-w-md">
            <Label htmlFor="search-users" className="text-sm font-medium">Search Users</Label>
            <Input
              id="search-users"
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error loading users</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: {searchTerm ? '/api/users/search' : '/api/users'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Please ensure the API server is running and try again.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">
            View registered users
            {memoizedPagination && (
              <span className="ml-2">
                • {memoizedPagination.totalCount} {debouncedSearchTerm ? 'search results' : 'total users'}
              </span>
            )}
            {debouncedSearchTerm && (
              <span className="ml-2 text-primary">
                • Searching for: "{debouncedSearchTerm}"
              </span>
            )}
            {searchTerm && searchTerm !== debouncedSearchTerm && (
              <span className="ml-2 text-muted-foreground">
                • Typing: "{searchTerm}"...
              </span>
            )}
            {isLoading && debouncedSearchTerm && (
              <span className="ml-2 text-blue-600">
                • Searching...
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <Search size={20} className="text-muted-foreground" />
        <div className="space-y-2 flex-1 max-w-md">
          <Label htmlFor="search-users-main" className="text-sm font-medium">Search Users</Label>
          <div className="relative">
            <Input
              ref={searchInputRef}
              id="search-users-main"
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchTerm(newValue);
                // Maintain focus after state update
                setTimeout(() => {
                  if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
                    searchInputRef.current.focus();
                    // Restore cursor position for better UX, especially for RTL text
                    const length = newValue.length;
                    searchInputRef.current.setSelectionRange(length, length);
                  }
                }, 0);
              }}
              className="w-full pr-10"
              autoComplete="off"
              spellCheck="false"
              dir="auto"
            />
            {/* Search indicator */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isLoading && debouncedSearchTerm ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : searchTerm && searchTerm !== debouncedSearchTerm ? (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              ) : debouncedSearchTerm ? (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-admin-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {memoizedUsers.map((user: any) => (
              <TableRow key={`user-${user.id}`} className="hover:bg-muted/50">
                {/* Avatar */}
                <TableCell>
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {user.profilePhoto ? (
                      <img
                        src={getProfilePhotoUrl(user.profilePhoto) || undefined}
                        alt={getFullName(user)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={user.profilePhoto ? "hidden" : ""}>
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {getFullName(user)}
                  </div>
                  {user.rating > 0 && (
                    <Badge 
                      variant={user.rating >= 4 ? "default" : user.rating >= 2 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {user.rating >= 4 ? "⭐ Excellent" : user.rating >= 2 ? "👍 Good" : "⚠️ Poor"} Seller
                    </Badge>
                  )}
                </div>
                </TableCell>

                {/* Contact */}
                <TableCell>
                  <div className="space-y-1 text-sm">
                    {user.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{user.phoneNumber}</span>
                      </div>
                    )}
                    {user.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{user.email}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  {(() => {
                    // Get role from API response, default to "user" if null
                    const userRole = user.userType || "user";

                    // Determine badge style and icon based on role
                    if (userRole === 'admin') {
                      return (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <User className="w-3 h-3" />
                          User
                        </Badge>
                      );
                    }
                  })()}
                </TableCell>

                {/* Rating */}
                <TableCell>
                  {user.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{user.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({user.numOfReviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No rating</span>
                  )}
                </TableCell>

                {/* Description */}
                <TableCell>
                  {user.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                      "{user.description}"
                    </p>
                  ) : (
                    <span className="text-sm text-muted-foreground">No description</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-center">
                  <div className="flex gap-2 justify-center">
                    {/* Only show Cart and Orders buttons for regular users */}
                    {(() => {
                      const userType = user.userType || "user";
                      const isRegularUser = userType === "user";
                      
                      if (isRegularUser) {
                        return (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewCart(user)}
                            >
                              <ShoppingCart size={14} className="mr-1" />
                              Cart
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrders(user)}
                            >
                              <Receipt size={14} className="mr-1" />
                              Orders
                            </Button>
                          </>
                        );
                      } else {
                        return (
                          <span className="text-sm text-muted-foreground">
                            No actions available
                          </span>
                        );
                      }
                    })()}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Card>

      {memoizedUsers && memoizedUsers.length === 0 && (
        <Card className="p-6 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">
            {debouncedSearchTerm ? 'No search results found' : 'No users found'}
          </h3>
          <p className="text-muted-foreground mt-2">
            {debouncedSearchTerm 
              ? `No users found matching "${debouncedSearchTerm}". Try a different search term.`
              : 'No users are currently registered in the system.'
            }
          </p>
        </Card>
      )}

      {/* Cart Viewing Modal */}
      <Dialog open={isCartModalOpen} onOpenChange={handleCloseCartModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ShoppingCart className="text-primary" size={24} />
              {selectedUser && `${getFullName(selectedUser)}'s Cart`}
            </DialogTitle>
            <DialogDescription>
              View the shopping cart items for this user. This is a read-only view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isCartLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-muted rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                      <div className="w-20 h-4 bg-muted rounded"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : cartError ? (
              <Card className="p-6 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-destructive">Error loading cart</h3>
                <p className="text-muted-foreground mt-2">
                  Failed to load the cart for this user. Please try again.
                </p>
              </Card>
            ) : cartData && cartData.items && cartData.items.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cart Items ({cartData.items.length})</h3>
                  <Badge variant="outline">
                    Total: ${cartData.items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {cartData.items.map((item: any, index: number) => (
                    <Card key={item.itemId || index} className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
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
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-1">
                          <h4 className="font-medium line-clamp-2">
                            {item.name || 'Unknown Product'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Quantity: <span className="font-medium">{item.quantity || 0}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Unit Price: <span className="font-medium">${item.price || 0}</span>
                            </span>
                          </div>
                        </div>

                        {/* Total Price */}
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            ${item.totalPrice || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Cart Summary */}
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Cart Total:</span>
                    <span className="text-primary">${cartData.items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground mt-2">
                    {cartData.createdAt && (
                      <div>
                        Cart created: {new Date(cartData.createdAt).toLocaleDateString()}
                      </div>
                    )}
                    {cartData.updatedAt && cartData.updatedAt !== cartData.createdAt && (
                      <div>
                        Last updated: {new Date(cartData.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Empty Cart</h3>
                <p className="text-muted-foreground mt-2">
                  This user hasn't added any items to their cart yet.
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders Viewing Modal */}
      <Dialog open={isOrdersModalOpen} onOpenChange={handleCloseOrdersModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Receipt className="text-primary" size={24} />
              {selectedUserForOrders && `${getFullName(selectedUserForOrders)}'s Orders`}
            </DialogTitle>
            <DialogDescription>
              View the order history for this user. This is a read-only view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isOrdersLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-4 bg-muted rounded w-20"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-32"></div>
                          <div className="h-3 bg-muted rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : ordersError ? (
              <Card className="p-6 text-center">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-destructive">Error loading orders</h3>
                <p className="text-muted-foreground mt-2">
                  Failed to load the orders for this user. Please try again.
                </p>
              </Card>
            ) : ordersData && ordersData.orders && ordersData.orders.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Order History ({ordersData.orders.length})</h3>
                  <Badge variant="outline">
                    {ordersData.pagination?.totalCount || ordersData.orders.length} total orders
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  {ordersData.orders.map((order: any) => (
                    <Card key={order.id} className="p-4">
                      <div className="space-y-4">
                        {/* Order Header */}
                        <div className="flex items-center justify-between pb-3 border-b">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Order #{order.id?.substring(0, 8)}...</span>
                              <Badge 
                                variant={
                                  order.orderStatus === 'تم التوصيل' ? 'default' : 
                                  order.orderStatus === 'تم الدفع' ? 'secondary' : 
                                  order.orderStatus === 'قيد التحضير' ? 'secondary' :
                                  order.orderStatus === 'قيد التوصيل' ? 'secondary' :
                                  order.orderStatus === 'تم الإلغاء' ? 'destructive' : 'outline'
                                }
                              >
                                {order.orderStatus || 'Unknown'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.createdAt && `Placed on ${new Date(order.createdAt).toLocaleDateString()}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-primary">
                              ${order.totalAmount || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Amount
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Order Items ({order.items.length})</h4>
                            {order.items.map((item: any, index: number) => (
                              <div key={item.id || index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
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
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {item.name || 'Unknown Product'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Qty: {item.quantity || 0} × ${item.price || 0} = ${item.totalPrice || 0}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Order Details */}
                        <div className="flex items-center justify-between text-sm pt-3 border-t">
                          <div className="space-y-1">
                            {order.shippingAddress && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Ship to:</span> {order.shippingAddress}
                              </div>
                            )}
                            {order.paymentMethod && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Payment:</span> {order.paymentMethod}
                              </div>
                            )}
                          </div>
                          {order.updatedAt && order.updatedAt !== order.createdAt && (
                            <div className="text-xs text-muted-foreground">
                              Updated: {new Date(order.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-6 text-center">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Orders Found</h3>
                <p className="text-muted-foreground mt-2">
                  This user hasn't placed any orders yet.
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 