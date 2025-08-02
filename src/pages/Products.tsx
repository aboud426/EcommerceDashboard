import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, Image as ImageIcon, Filter, X, Calendar, User, Hash, LayoutGrid, Table as TableIcon, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// API function to fetch categories
const fetchCategories = async () => {
  try {
    const response = await fetch('/api/Category?PageNumber=1&PageSize=50');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    
    if (data.success && data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    
    // Fallback: return empty array if data structure is unexpected
    console.warn('Categories API returned unexpected data structure:', data);
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return []; // Always return an array on error
  }
};

// API function to fetch user by ID
const fetchUserById = async (userId: string) => {
  if (!userId) return null;
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  const data = await response.json();
  
  if (data.success && data.data) {
    return data.data;
  }
  
  return null;
};

// API function to fetch category by ID
const fetchCategoryById = async (categoryId: string) => {
  if (!categoryId) return null;
  const response = await fetch(`/api/Category/${categoryId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch category');
  }
  const data = await response.json();
  
  if (data.success && data.data) {
    return data.data;
  }
  
  return null;
};

// API function to fetch products
const fetchProducts = async (filters?: { categoryId?: string; minPrice?: number; maxPrice?: number }) => {
  let url = '/api/products/filter?pageNumber=1&pageSize=10';
  
  if (filters?.categoryId) {
    url += `&categoryId=${filters.categoryId}`;
  }
  if (filters?.minPrice && filters.minPrice > 0) {
    url += `&minPrice=${filters.minPrice}`;
  }
  if (filters?.maxPrice && filters.maxPrice > 0) {
    url += `&maxPrice=${filters.maxPrice}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  const data = await response.json();
  
  // Extract the products array from the nested response structure
  if (data.success && data.data && data.data.data) {
    return {
      products: data.data.data,
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
  
  return { products: [], pagination: null };
};

// Helper function to get media URL with better error handling
const getMediaUrl = (mediaUrl: string | null) => {
  if (!mediaUrl) return null;
  
  // Handle various URL formats
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  
  // Remove leading slash if present
  const cleanPath = mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl;
  
  // Check if it's a valid file extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = validExtensions.some(ext => 
    cleanPath.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    console.warn('Invalid image URL detected:', mediaUrl);
    return null;
  }
  
  // Construct the full API URL
  return `/api/Media/file/${cleanPath}`;
};

// API function to fetch product ownership summary
const fetchProductOwnership = async (serialNumber: string, token: string) => {
  console.log('🔍 Attempting to fetch product ownership for serial:', serialNumber);
  
  const response = await fetch(`http://localhost:3000/api/product-ownership-summary/${serialNumber}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('📊 Product Ownership API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Product Ownership API Error Response:', responseText);
    
    if (response.status === 404) {
      throw new Error('No ownership information found for this product');
    }
    if (response.status === 401) {
      throw new Error('Authentication failed. Please log out and log in again.');
    }
    
    throw new Error(`Failed to fetch product ownership (${response.status})`);
  }
  
  const data = await response.json();
  console.log('✅ Product ownership fetched successfully:', data);
  return data;
};

export default function Products() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedSerialNumber, setSelectedSerialNumber] = useState<string | null>(null);
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Ensure categories is always an array
  const categoriesArray = Array.isArray(categories) ? categories : [];

  // Fetch user details when modal is open and product has userId
  const { data: productUser } = useQuery({
    queryKey: ['user', selectedProduct?.userId],
    queryFn: () => fetchUserById(selectedProduct?.userId),
    enabled: !!selectedProduct?.userId && isProductModalOpen,
  });

  // Fetch category details when modal is open and product has categoryId
  const { data: productCategory } = useQuery({
    queryKey: ['category', selectedProduct?.categoryId],
    queryFn: () => fetchCategoryById(selectedProduct?.categoryId),
    enabled: !!selectedProduct?.categoryId && isProductModalOpen,
  });

  // Fetch products with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', selectedCategoryId, minPrice, maxPrice],
    queryFn: () => {
      const filters: { categoryId?: string; minPrice?: number; maxPrice?: number } = {};
      
      if (selectedCategoryId !== 'all') {
        filters.categoryId = selectedCategoryId;
      }
      if (minPrice && !isNaN(Number(minPrice))) {
        filters.minPrice = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        filters.maxPrice = Number(maxPrice);
      }
      
      return fetchProducts(Object.keys(filters).length > 0 ? filters : undefined);
    },
  });

  const products: any[] = data?.products || [];
  const pagination = data?.pagination;

  // Fetch product ownership data when modal is open and serial number is selected
  const { data: ownershipData, isLoading: isOwnershipLoading, error: ownershipError } = useQuery({
    queryKey: ['productOwnership', selectedSerialNumber],
    queryFn: () => {
      if (!user?.token || !selectedSerialNumber) {
        throw new Error('Authentication or serial number required');
      }
      return fetchProductOwnership(selectedSerialNumber, user.token);
    },
    enabled: !!user?.token && !!selectedSerialNumber && isOwnershipModalOpen,
  });

  // Handle product tracking button click
  const handleTrackProduct = (serialNumber: string) => {
    setSelectedSerialNumber(serialNumber);
    setIsOwnershipModalOpen(true);
  };

  // Handle ownership modal close
  const handleCloseOwnershipModal = () => {
    setIsOwnershipModalOpen(false);
    setSelectedSerialNumber(null);
  };

  // Handle price filter application
  const handleApplyPriceFilter = () => {
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
  };

  // Handle clearing price filter
  const handleClearPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
    setTempMinPrice('');
    setTempMaxPrice('');
  };

  // Handle product click
  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "0001-01-01T00:00:00") return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-muted-foreground" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16"></div>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Loading categories..." />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <DollarSign size={20} className="text-muted-foreground mb-2" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-9 bg-muted rounded w-24"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-9 bg-muted rounded w-24"></div>
              </div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
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
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">View product catalog</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-muted-foreground" />
              <div className="space-y-2">
                <Label htmlFor="category-select-error" className="text-sm font-medium">Category</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-64" id="category-select-error">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoriesArray?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-end gap-3">
              <DollarSign size={20} className="text-muted-foreground mb-2" />
              <div className="space-y-2">
                <Label htmlFor="min-price-error" className="text-sm font-medium">Min Price</Label>
                <Input
                  id="min-price-error"
                  type="number"
                  placeholder="0"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-price-error" className="text-sm font-medium">Max Price</Label>
                <Input
                  id="max-price-error"
                  type="number"
                  placeholder="∞"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApplyPriceFilter} size="sm">
                  Apply
                </Button>
                {(minPrice || maxPrice) && (
                  <Button onClick={handleClearPriceFilter} variant="outline" size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error loading products</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: /api/products/filter
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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">
            View product catalog
            {pagination && (
              <span className="ml-2">
                • {pagination.totalCount} total products
              </span>
            )}
            {selectedCategoryId && selectedCategoryId !== 'all' && categoriesArray && (
              <span className="ml-2 text-primary">
                • Filtered by: {categoriesArray.find((cat: any) => cat.id === selectedCategoryId)?.name}
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="ml-2 text-primary">
                • Price: {minPrice && `$${minPrice}`}{minPrice && maxPrice && ' - '}{maxPrice && `$${maxPrice}`}
              </span>
            )}
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          {/* Category Filter */}
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-muted-foreground" />
            <div className="space-y-2">
              <Label htmlFor="category-select" className="text-sm font-medium">Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-64" id="category-select">
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Filter by category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                  ) : categoriesError ? (
                    <SelectItem value="error" disabled>Error loading categories</SelectItem>
                  ) : (
                    categoriesArray?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-end gap-3">
            <DollarSign size={20} className="text-muted-foreground mb-2" />
            <div className="space-y-2">
              <Label htmlFor="min-price" className="text-sm font-medium">Min Price</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="0"
                value={tempMinPrice}
                onChange={(e) => setTempMinPrice(e.target.value)}
                className="w-24"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-price" className="text-sm font-medium">Max Price</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="∞"
                value={tempMaxPrice}
                onChange={(e) => setTempMaxPrice(e.target.value)}
                className="w-24"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyPriceFilter} size="sm">
                Apply
              </Button>
              {(minPrice || maxPrice) && (
                <Button onClick={handleClearPriceFilter} variant="outline" size="sm">
                  Clear
                </Button>
              )}
            </div>
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
      </div>

      {products && products.length > 0 ? (
        <>
          {viewMode === 'cards' ? (
            // Cards View
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product: any) => (
                <Card 
                  key={product.id} 
                  className="shadow-admin-md hover:shadow-admin-lg transition-shadow cursor-pointer" 
                  onClick={() => handleProductClick(product)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Product Image */}
                      {product.media && product.media.length > 0 ? (
                        <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden">
                          <img
                            src={getMediaUrl(product.media[0].url) || undefined}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex items-start justify-center">
                        <div className="p-3 bg-primary-muted rounded-lg">
                          <Package className="text-primary" size={24} />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold line-clamp-2">
                          {product.name || 'Unnamed Product'}
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-3">
                          {product.description || 'No description available'}
                        </p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground mt-1">
                            SKU: {product.sku}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <DollarSign size={16} className="text-primary" />
                          <span className="font-semibold">
                            {product.price ? `$${Number(product.price).toFixed(2)}` : 'Price not set'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Stock: {product.stockQuantity ?? 'N/A'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {product.categoryName && (
                          <span className="text-xs bg-primary-muted text-primary px-2 py-1 rounded-full">
                            {product.categoryName}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          {product.isAvailable ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Available
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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
                        <TableHead className="w-[80px]">Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product: any) => (
                        <TableRow 
                          key={product.id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleProductClick(product)}
                        >
                          <TableCell>
                            <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden">
                              {product.media && product.media.length > 0 ? (
                                <img
                                  src={getMediaUrl(product.media[0].url) || undefined}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${product.media && product.media.length > 0 ? 'hidden' : ''}`}>
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium truncate max-w-[200px]">
                                {product.name || 'Unnamed Product'}
                              </div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.categoryName ? (
                              <Badge variant="outline" className="text-xs">
                                {product.categoryName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No category</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Hash size={12} className="text-muted-foreground" />
                              <span className="text-xs font-mono">
                                {product.sku || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign size={12} className="text-muted-foreground" />
                              <span className="font-medium">
                                {product.price ? `${Number(product.price).toFixed(2)}` : 'Not set'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {product.stockQuantity ?? 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {product.isAvailable ? (
                              <Badge className="bg-green-100 text-green-800">
                                Available
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                Unavailable
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-muted-foreground" />
                              <span className="text-xs">
                                {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
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
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-muted-foreground mt-2">
            No products are currently available in the catalog.
          </p>
        </Card>
      )}

      {/* Product Detail Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Package className="text-primary" size={24} />
              {selectedProduct?.name || 'Product Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed information about the product.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Images */}
              {selectedProduct.media && selectedProduct.media.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProduct.media.map((media: any, index: number) => (
                      <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={getMediaUrl(media.url) || undefined}
                          alt={`${selectedProduct.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="text-base">{selectedProduct.name || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-base">{selectedProduct.description || 'No description available'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-primary" />
                      <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                      <p className="text-lg font-semibold">
                        {selectedProduct.price ? `$${Number(selectedProduct.price).toFixed(2)}` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                      <p className="text-base">
                        {productCategory ? productCategory.name : (selectedProduct.categoryName || 'Uncategorized')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Availability</Label>
                      <Badge variant={selectedProduct.isAvailable ? "default" : "secondary"}>
                        {selectedProduct.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                        <p className="text-base">
                          {productUser ? (
                            `${productUser.firstName || ''} ${productUser.middleName || ''} ${productUser.lastName || ''}`.trim() || 'Unknown User'
                          ) : 'Loading...'}
                        </p>
                        {productUser && (
                          <div className="text-xs text-muted-foreground space-y-1 mt-1">
                            {productUser.phoneNumber && (
                              <p>📞 {productUser.phoneNumber}</p>
                            )}
                            {productUser.email && (
                              <p>✉️ {productUser.email}</p>
                            )}
                            {productUser.rating && (
                              <p>⭐ {productUser.rating}/5 ({productUser.numOfReviews} reviews)</p>
                            )}
                            {productUser.description && (
                              <p className="italic">"{productUser.description}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Technical Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Hash size={16} className="text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                        <p className="text-base font-mono">{selectedProduct.sku || 'Not specified'}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-mono">{selectedProduct.serialNumber || 'Not specified'}</p>
                        {selectedProduct.serialNumber && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackProduct(selectedProduct.serialNumber);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Truck size={12} />
                            Track
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Stock Quantity</Label>
                      <p className="text-base">{selectedProduct.stockQuantity ?? 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                      <p className="text-base">{formatDate(selectedProduct.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Updated At</Label>
                      <p className="text-base">{formatDate(selectedProduct.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Features</h3>
                  <div className="grid gap-2">
                    {selectedProduct.features.map((feature: any, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <p className="text-base">{feature.name || feature.title || feature}</p>
                        {feature.description && (
                          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Favorite Status */}
              {selectedProduct.hasOwnProperty('isFavorite') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Info</h3>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Favorite Status</Label>
                    <Badge variant={selectedProduct.isFavorite ? "default" : "outline"}>
                      {selectedProduct.isFavorite ? "Favorite" : "Not Favorite"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Ownership Modal */}
      <Dialog open={isOwnershipModalOpen} onOpenChange={handleCloseOwnershipModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Truck className="text-primary" size={24} />
              Product Ownership Summary
            </DialogTitle>
            <DialogDescription>
              {selectedSerialNumber && `Ownership information for product serial: ${selectedSerialNumber}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isOwnershipLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
                <div className="h-20 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              </div>
            ) : ownershipError ? (
              <Card className="p-6 text-center">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Ownership Information Found</h3>
                <p className="text-muted-foreground">
                  {ownershipError.message || 'No ownership record exists for this product serial number.'}
                </p>
              </Card>
            ) : ownershipData ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-2">Product Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span className="font-mono">{ownershipData.serialNumber || selectedSerialNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Product Name:</span>
                          <span>{ownershipData.productName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model:</span>
                          <span>{ownershipData.model || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={ownershipData.status === 'active' ? 'default' : 'secondary'}>
                            {ownershipData.status || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Ownership Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Owner:</span>
                          <span>{ownershipData.currentOwner || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Purchase Date:</span>
                          <span>{ownershipData.purchaseDate ? formatDate(ownershipData.purchaseDate) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warranty:</span>
                          <span>{ownershipData.warrantyStatus || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {ownershipData.history && ownershipData.history.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Ownership History</h4>
                      <div className="space-y-2">
                        {ownershipData.history.map((record: any, index: number) => (
                          <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{record.event || 'Transfer'}</span>
                              <span className="text-muted-foreground">
                                {record.date ? formatDate(record.date) : 'Date unknown'}
                              </span>
                            </div>
                            {record.description && (
                              <p className="text-muted-foreground mt-1">{record.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {ownershipData.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground">{ownershipData.notes}</p>
                    </div>
                  )}
                </Card>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 