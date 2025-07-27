import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, Edit, Trash2, Calendar, Hash, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// API function to fetch categories (no auth required)
const fetchCategories = async () => {
  const response = await fetch('/api/Category?PageNumber=1&PageSize=50');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return {
      categories: data.data.data,
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
  
  return { categories: [], pagination: null };
};

// API function to fetch single category (no auth required)
const fetchCategoryById = async (categoryId: string) => {
  const response = await fetch(`/api/Category/${categoryId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch category');
  }
  const data = await response.json();
  
  if (data.success && data.data) {
    return data.data;
  }
  
  throw new Error('Category not found');
};

// API function to create category (auth required)
const createCategory = async (formData: FormData, token: string) => {
  console.log('🔐 Attempting to create category with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  // Try multiple authentication methods
  const authMethods = [
    // Method 1: Bearer token (standard)
    { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${token}` } },
    // Method 2: Just the token
    { name: 'Token Only', headers: { 'Authorization': token } },
    // Method 3: Custom header
    { name: 'X-Auth-Token', headers: { 'X-Auth-Token': token } },
    // Method 4: No auth (to see if endpoint changed)
    { name: 'No Auth', headers: {} }
  ];

  for (const method of authMethods) {
    console.log(`🔄 Trying ${method.name}...`);
    
    try {
      const response = await fetch('/api/Category', {
        method: 'POST',
        headers: method.headers,
        body: formData,
      });
      
      console.log(`📊 ${method.name} Response status:`, response.status);
      
      if (response.ok) {
        console.log(`✅ ${method.name} worked!`);
        return response.json();
      }
      
      // Log error details for this method
      const responseText = await response.text();
      console.log(`❌ ${method.name} failed:`, response.status, responseText);
      
      // If this is the last method and it still fails, throw error
      if (method === authMethods[authMethods.length - 1]) {
        if (response.status === 401) {
          throw new Error(`All authentication methods failed. Last error: ${responseText}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData?.message || errorData?.title || `Failed to create category (${response.status})`);
        } catch {
          throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`💥 ${method.name} threw error:`, error);
      
      // If this is the last method, re-throw the error
      if (method === authMethods[authMethods.length - 1]) {
        throw error;
      }
    }
  }
};

// API function to update category (auth required)
const updateCategory = async (categoryId: string, formData: FormData, token: string) => {
  console.log('🔐 Attempting to update category with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/Category/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  console.log('📊 Update API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Update API Error Response:', responseText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please log out and log in again.');
    }
    
    try {
      const errorData = JSON.parse(responseText);
      
      // Handle specific error types
      if (errorData.errorType === 'ValidationError') {
        if (errorData.message?.includes('file')) {
          throw new Error(`Image upload error: ${errorData.message}`);
        }
        throw new Error(`Validation error: ${errorData.message || 'Invalid data provided'}`);
      }
      
      throw new Error(errorData?.message || errorData?.title || 'Failed to update category');
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// API function to delete category (auth required)
const deleteCategory = async (categoryId: string, token: string) => {
  console.log('🔐 Attempting to delete category with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/Category/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('📊 Delete API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Delete API Error Response:', responseText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please log out and log in again.');
    }
    
    try {
      const errorData = JSON.parse(responseText);
      throw new Error(errorData?.message || errorData?.title || 'Failed to delete category');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString || dateString === "0001-01-01T00:00:00") {
    return "Date not recorded";
  }
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString();
  } catch (error) {
    return "Invalid date";
  }
};

// Helper function to get category image URL
const getCategoryImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  
  // The imageUrl from API looks like "media/categories/filename.png"
  // The API endpoint is /api/Category/image/{imagePath} where:
  // - imagePath gets URL decoded
  // - Leading slash gets removed 
  // - Path separators get normalized
  // - Must start with "media/categories"
  
  // Remove leading slash if present since API will remove it anyway
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
  
  // Construct the full API URL
  return `/api/Category/image/${cleanPath}`;
};

export default function Categories() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    isActive: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const categories = data?.categories || [];
  const pagination = data?.pagination;

  // Mutation for creating category
  const createCategoryMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return createCategory(formData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating category
  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, formData }: { categoryId: string; formData: FormData }) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return updateCategory(categoryId, formData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditModalOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting category
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return deleteCategory(categoryId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form function
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentId: '',
      isActive: true,
    });
    setSelectedFile(null);
    setIsSubmitting(false);
    setEditingCategory(null);
  };

  // Handle delete category button click
  const handleDeleteCategory = (category: any) => {
    console.log('🔍 Delete category requested for:', category.name);
    console.log('🔑 Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Delete blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to delete categories",
        variant: "destructive",
      });
      return;
    }
    
    setDeletingCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    
    console.log('🗑️ Confirming delete for category:', deletingCategory.name);
    deleteCategoryMutation.mutate(deletingCategory.id);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    if (!deleteCategoryMutation.isPending) {
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
    }
  };

  // Handle form submission (both create and edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started...');
    console.log('👤 Current user:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('✏️ Is editing:', !!editingCategory);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Form submission blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: editingCategory ? "Please log in to edit categories" : "Please log in to create categories",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      console.warn('❌ Form submission blocked: No category name');
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Starting form submission with data:', formData);
    setIsSubmitting(true);

    const submitFormData = new FormData();
    submitFormData.append('Name', formData.name.trim());
    submitFormData.append('Description', formData.description.trim());
    submitFormData.append('IsActive', formData.isActive.toString());
    
    if (formData.parentId && formData.parentId !== 'none') {
      submitFormData.append('ParentId', formData.parentId);
    }
    
    if (selectedFile) {
      console.log('📎 Including new file:', selectedFile.name);
      submitFormData.append('imageFile', selectedFile);
    } else if (editingCategory) {
      // For updates without a new image, create a minimal 1x1 transparent PNG
      console.log('📎 No new image selected for update, creating minimal PNG');
      
      // Create a minimal 1x1 transparent PNG programmatically
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set transparent pixel
        ctx.clearRect(0, 0, 1, 1);
        
        // Convert canvas to blob and create file
        const dataURL = canvas.toDataURL('image/png');
        const binaryString = atob(dataURL.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const minimalImageFile = new File([bytes], 'minimal.png', { type: 'image/png' });
        submitFormData.append('imageFile', minimalImageFile);
        console.log('📎 Created minimal PNG:', minimalImageFile.size, 'bytes');
      } else {
        // Fallback: try with a base64 encoded 1x1 transparent PNG
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const binaryString = atob(transparentPngBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const minimalImageFile = new File([bytes], 'transparent.png', { type: 'image/png' });
        submitFormData.append('imageFile', minimalImageFile);
        console.log('📎 Created fallback PNG:', minimalImageFile.size, 'bytes');
      }
    }

    console.log('📤 Submitting FormData to API...');
    
    // Debug: Log FormData contents
    console.log('📋 FormData contents:');
    for (const [key, value] of submitFormData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    if (editingCategory) {
      // Update existing category
      updateCategoryMutation.mutate({ categoryId: editingCategory.id, formData: submitFormData });
    } else {
      // Create new category
      createCategoryMutation.mutate(submitFormData);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      resetForm();
    }
  };

  // Handle add category button click
  const handleAddCategory = () => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to create categories",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Authentication check passed, opening modal');
    setIsAddModalOpen(true);
  };

  // Handle edit category button click
  const handleEditCategory = (category: any) => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    console.log('🔗 Category to edit:', category);

    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to edit categories",
        variant: "destructive",
      });
      return;
    }

    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parentId: category.parentId || "none",
      isActive: category.isActive,
    });
    setSelectedFile(null); // Clear selected file for new edit
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="h-8 bg-muted rounded w-32 animate-pulse mb-2"></div>
            <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="h-6 bg-muted rounded w-40 mb-2"></div>
                <div className="h-4 bg-muted rounded w-64 mb-2"></div>
                <div className="h-4 bg-muted rounded w-32"></div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground">Manage product categories</p>
          </div>
          <Button 
            className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddCategory}
          >
            <Plus size={16} className="mr-2" />
            Add Category
          </Button>
        </div>
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error loading categories</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: /api/Category
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories
            {pagination && (
              <span className="block sm:inline sm:ml-2">
                • {pagination.totalCount} total categories
              </span>
            )}
          </p>
        </div>
        <Button 
          className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
          onClick={handleAddCategory}
        >
          <Plus size={16} className="mr-2" />
          Add Category
        </Button>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid gap-4">
          {categories.map((category: any) => (
            <Card key={category.id} className="shadow-admin-md hover:shadow-admin-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-primary-muted">
                      {category.imageUrl ? (
                        <img
                          src={getCategoryImageUrl(category.imageUrl)}
                          alt={category.name || 'Category'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Silently hide broken images and show fallback
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${category.imageUrl ? 'hidden' : ''}`}>
                        <Package className="text-primary" size={24} />
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div>
                        <h3 className="text-lg font-semibold break-words">{category.name || 'Unnamed Category'}</h3>
                        <p className="text-muted-foreground break-words">
                          {category.description || 'No description available'}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        {category.id && (
                          <div className="flex items-center gap-1">
                            <Hash size={14} />
                            <span className="break-all">ID: {category.id}</span>
                          </div>
                        )}
                        {/* Handle both createdAt and CreatedAt (case sensitivity) */}
                        {(category.createdAt || category.CreatedAt) && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Created: {formatDate(category.createdAt || category.CreatedAt)}</span>
                          </div>
                        )}
                        {/* Handle both updatedAt and UpdatedAt (case sensitivity) */}
                        {(category.updatedAt || category.UpdatedAt) && (category.updatedAt || category.UpdatedAt) !== (category.createdAt || category.CreatedAt) && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Updated: {formatDate(category.updatedAt || category.UpdatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleEditCategory(category)}>
                      <Edit size={16} className="mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleDeleteCategory(category)}>
                      <Trash2 size={16} className="mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No categories found</h3>
          <p className="text-muted-foreground mt-2">
            No categories are currently available. Create your first category to get started.
          </p>
          <Button 
            className="mt-4 bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddCategory}
          >
            <Plus size={16} className="mr-2" />
            Add Category
          </Button>
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
              Showing {categories.length} of {pagination.totalCount} categories
            </span>
          </div>
        </Card>
      )}

      {/* Add Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Plus className="text-primary" size={24} />
              Add New Category
            </DialogTitle>
            <DialogDescription>
              Create a new category to organize your products. Categories can be nested by selecting a parent category.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Category Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="category-name" className="text-sm font-medium">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="category-name"
                  type="text"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="category-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="category-description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Parent Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Parent Category
                </Label>
                <Select 
                  value={formData.parentId || "none"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value === "none" ? "" : value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Top Level)</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive categories won't be visible to users
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  disabled={isSubmitting}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="category-image" className="text-sm font-medium">
                  Category Image
                </Label>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {(selectedFile || (editingCategory && editingCategory.imageUrl)) && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted border">
                      {selectedFile ? (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : editingCategory?.imageUrl ? (
                        <img
                          src={getCategoryImageUrl(editingCategory.imageUrl)}
                          alt="Current image"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Silently hide broken images and show fallback
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className="hidden w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('category-image')?.click()}
                      disabled={isSubmitting}
                      className="w-full sm:w-fit"
                    >
                      <Upload size={16} className="mr-2" />
                      {editingCategory ? 'Change Image' : 'Choose Image'}
                    </Button>
                    {selectedFile && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-muted-foreground truncate">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          disabled={isSubmitting}
                          className="flex-shrink-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input
                    id="category-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Edit className="text-primary" size={24} />
              Edit Category
            </DialogTitle>
            <DialogDescription>
              Modify the details of the selected category.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Category Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="edit-category-name" className="text-sm font-medium">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-category-name"
                  type="text"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-category-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="edit-category-description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Parent Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Parent Category
                </Label>
                <Select 
                  value={formData.parentId || "none"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value === "none" ? "" : value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Top Level)</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive categories won't be visible to users
                  </p>
                </div>
                <Switch
                  id="edit-is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  disabled={isSubmitting}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="edit-category-image" className="text-sm font-medium">
                  Category Image
                </Label>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {(selectedFile || (editingCategory && editingCategory.imageUrl)) && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted border">
                      {selectedFile ? (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : editingCategory?.imageUrl ? (
                        <img
                          src={getCategoryImageUrl(editingCategory.imageUrl)}
                          alt="Current image"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Silently hide broken images and show fallback
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className="hidden w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-category-image')?.click()}
                      disabled={isSubmitting}
                      className="w-full sm:w-fit"
                    >
                      <Upload size={16} className="mr-2" />
                      {editingCategory ? 'Change Image' : 'Choose Image'}
                    </Button>
                    {selectedFile && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-muted-foreground truncate">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          disabled={isSubmitting}
                          className="flex-shrink-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input
                    id="edit-category-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Trash2 className="text-destructive" size={24} />
              Delete Category
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
              {deletingCategory?.imageUrl && " The category image will also be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteCategoryMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}