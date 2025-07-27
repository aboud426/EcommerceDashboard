import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Monitor, Edit, Trash2, Calendar, Hash } from "lucide-react";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// API function to fetch media types (no auth required)
const fetchMediaTypes = async () => {
  const response = await fetch('/api/MediaType?PageNumber=1&PageSize=50');
  if (!response.ok) {
    throw new Error('Failed to fetch media types');
  }
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return {
      mediaTypes: data.data.data,
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
  
  return { mediaTypes: [], pagination: null };
};

// API function to create media type (auth required)
const createMediaType = async (mediaTypeData: any, token: string) => {
  console.log('🔐 Attempting to create media type with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch('/api/MediaType', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mediaTypeData),
  });
  
  console.log('📊 Create API Response status:', response.status);
  
  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Create API Error Response:', responseText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please log out and log in again.');
    }
    
    try {
      const errorData = JSON.parse(responseText);
      throw new Error(errorData?.message || errorData?.title || 'Failed to create media type');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// API function to update media type (auth required)
const updateMediaType = async (mediaTypeId: string, mediaTypeData: any, token: string) => {
  console.log('🔐 Attempting to update media type with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/MediaType/${mediaTypeId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mediaTypeData),
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
      throw new Error(errorData?.message || errorData?.title || 'Failed to update media type');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// API function to delete media type (auth required)
const deleteMediaType = async (mediaTypeId: string, token: string) => {
  console.log('🔐 Attempting to delete media type with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/MediaType/${mediaTypeId}`, {
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
      throw new Error(errorData?.message || errorData?.title || 'Failed to delete media type');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString || dateString === "0001-01-01T00:00:00") return "Not set";
  return new Date(dateString).toLocaleDateString();
};

export default function MediaTypes() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMediaType, setEditingMediaType] = useState<any>(null);
  const [deletingMediaType, setDeletingMediaType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['mediaTypes'],
    queryFn: fetchMediaTypes,
  });

  const mediaTypes = data?.mediaTypes || [];
  const pagination = data?.pagination;

  // Mutation for creating media type
  const createMediaTypeMutation = useMutation({
    mutationFn: (mediaTypeData: any) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return createMediaType(mediaTypeData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaTypes'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Media type created successfully",
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

  // Mutation for updating media type
  const updateMediaTypeMutation = useMutation({
    mutationFn: ({ mediaTypeId, mediaTypeData }: { mediaTypeId: string; mediaTypeData: any }) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return updateMediaType(mediaTypeId, mediaTypeData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaTypes'] });
      setIsEditModalOpen(false);
      setEditingMediaType(null);
      resetForm();
      toast({
        title: "Success",
        description: "Media type updated successfully",
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

  // Mutation for deleting media type
  const deleteMediaTypeMutation = useMutation({
    mutationFn: (mediaTypeId: string) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return deleteMediaType(mediaTypeId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaTypes'] });
      setIsDeleteDialogOpen(false);
      setDeletingMediaType(null);
      toast({
        title: "Success",
        description: "Media type deleted successfully",
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
    });
    setIsSubmitting(false);
    setEditingMediaType(null);
  };

  // Handle form submission (both create and edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started...');
    console.log('👤 Current user:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('✏️ Is editing:', !!editingMediaType);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Form submission blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: editingMediaType ? "Please log in to edit media types" : "Please log in to create media types",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      console.warn('❌ Form submission blocked: No media type name');
      toast({
        title: "Validation Error",
        description: "Media type name is required",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Starting form submission with data:', formData);
    setIsSubmitting(true);

    const submitData = {
      name: formData.name.trim(),
    };

    console.log('📤 Submitting data to API...');
    
    if (editingMediaType) {
      // Update existing media type
      updateMediaTypeMutation.mutate({ mediaTypeId: editingMediaType.id, mediaTypeData: submitData });
    } else {
      // Create new media type
      createMediaTypeMutation.mutate(submitData);
    }
  };

  // Handle add media type button click
  const handleAddMediaType = () => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to create media types",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Authentication check passed, opening modal');
    setIsAddModalOpen(true);
  };

  // Handle edit media type button click
  const handleEditMediaType = (mediaType: any) => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    console.log('🔗 Media type to edit:', mediaType);

    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to edit media types",
        variant: "destructive",
      });
      return;
    }

    setEditingMediaType(mediaType);
    setFormData({
      name: mediaType.name,
    });
    setIsEditModalOpen(true);
  };

  // Handle delete media type button click
  const handleDeleteMediaType = (mediaType: any) => {
    console.log('🔍 Delete media type requested for:', mediaType.name);
    console.log('🔑 Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Delete blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to delete media types",
        variant: "destructive",
      });
      return;
    }
    
    setDeletingMediaType(mediaType);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (!deletingMediaType) return;
    
    console.log('🗑️ Confirming delete for media type:', deletingMediaType.name);
    deleteMediaTypeMutation.mutate(deletingMediaType.id);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    if (!deleteMediaTypeMutation.isPending) {
      setIsDeleteDialogOpen(false);
      setDeletingMediaType(null);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Media Types</h1>
            <p className="text-muted-foreground">Manage media types</p>
          </div>
          <Button 
            className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddMediaType}
          >
            <Plus size={16} className="mr-2" />
            Add Media Type
          </Button>
        </div>
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error loading media types</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: /api/MediaType
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Media Types</h1>
          <p className="text-muted-foreground">
            Manage media types
            {pagination && (
              <span className="block sm:inline sm:ml-2">
                • {pagination.totalCount} total media types
              </span>
            )}
          </p>
        </div>
        <Button 
          className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
          onClick={handleAddMediaType}
        >
          <Plus size={16} className="mr-2" />
          Add Media Type
        </Button>
      </div>

      {mediaTypes && mediaTypes.length > 0 ? (
        <div className="grid gap-4">
          {mediaTypes.map((mediaType: any) => (
            <Card key={mediaType.id} className="shadow-admin-md hover:shadow-admin-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-primary-muted">
                      <div className="w-full h-full flex items-center justify-center">
                        <Monitor className="text-primary" size={24} />
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div>
                        <h3 className="text-lg font-semibold break-words">{mediaType.name || 'Unnamed Media Type'}</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        {mediaType.id && (
                          <div className="flex items-center gap-1">
                            <Hash size={14} />
                            <span className="break-all">ID: {mediaType.id}</span>
                          </div>
                        )}
                        {mediaType.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Created: {formatDate(mediaType.createdAt)}</span>
                          </div>
                        )}
                        {mediaType.updatedAt && mediaType.updatedAt !== mediaType.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Updated: {formatDate(mediaType.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleEditMediaType(mediaType)}>
                      <Edit size={16} className="mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleDeleteMediaType(mediaType)}>
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
          <Monitor className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No media types found</h3>
          <p className="text-muted-foreground mt-2">
            No media types are currently available. Create your first media type to get started.
          </p>
          <Button 
            className="mt-4 bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddMediaType}
          >
            <Plus size={16} className="mr-2" />
            Add Media Type
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
              Showing {mediaTypes.length} of {pagination.totalCount} media types
            </span>
          </div>
        </Card>
      )}

      {/* Add Media Type Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Plus className="text-primary" size={24} />
              Add New Media Type
            </DialogTitle>
            <DialogDescription>
              Create a new media type to categorize different forms of media content.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Media Type Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="media-type-name" className="text-sm font-medium">
                  Media Type Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="media-type-name"
                  type="text"
                  placeholder="Enter media type name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
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
                {isSubmitting ? 'Creating...' : 'Create Media Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Media Type Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Edit className="text-primary" size={24} />
              Edit Media Type
            </DialogTitle>
            <DialogDescription>
              Modify the name of the selected media type.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Media Type Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="edit-media-type-name" className="text-sm font-medium">
                  Media Type Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-media-type-name"
                  type="text"
                  placeholder="Enter media type name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
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
                {isSubmitting ? 'Updating...' : 'Update Media Type'}
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
              Delete Media Type
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMediaType?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMediaTypeMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMediaTypeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMediaTypeMutation.isPending ? 'Deleting...' : 'Delete Media Type'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 