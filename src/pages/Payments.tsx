import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, Edit, Trash2, Calendar, Hash } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// API function to fetch payment methods (auth required)
const fetchPaymentMethods = async (token: string) => {
  const response = await fetch('/api/PaymentMethod?pageNumber=1&pageSize=50', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    throw new Error('Failed to fetch payment methods');
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.data) {
    return {
      paymentMethods: data.data.data,
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
  
  return { paymentMethods: [], pagination: null };
};

// API function to create payment method (auth required)
const createPaymentMethod = async (paymentMethodData: any, token: string) => {
  console.log('🔐 Attempting to create payment method with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch('/api/PaymentMethod', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentMethodData),
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
      throw new Error(errorData?.message || errorData?.title || 'Failed to create payment method');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// API function to update payment method (auth required)
const updatePaymentMethod = async (paymentMethodId: string, paymentMethodData: any, token: string) => {
  console.log('🔐 Attempting to update payment method with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/PaymentMethod/${paymentMethodId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentMethodData),
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
      throw new Error(errorData?.message || errorData?.title || 'Failed to update payment method');
    } catch {
      throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }
  
  return response.json();
};

// API function to delete payment method (auth required)
const deletePaymentMethod = async (paymentMethodId: string, token: string) => {
  console.log('🔐 Attempting to delete payment method with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  const response = await fetch(`/api/PaymentMethod/${paymentMethodId}`, {
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
      throw new Error(errorData?.message || errorData?.title || 'Failed to delete payment method');
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

export default function PaymentMethods() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => {
      if (!user?.token) {
        throw new Error('Authentication required');
      }
      return fetchPaymentMethods(user.token);
    },
    enabled: !!user?.token, // Only fetch when authenticated
  });

  const paymentMethods = data?.paymentMethods || [];
  const pagination = data?.pagination;

  // Mutation for creating payment method
  const createPaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodData: any) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return createPaymentMethod(paymentMethodData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Payment method created successfully",
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

  // Mutation for updating payment method
  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({ paymentMethodId, paymentMethodData }: { paymentMethodId: string; paymentMethodData: any }) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return updatePaymentMethod(paymentMethodId, paymentMethodData, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setIsEditModalOpen(false);
      setEditingPaymentMethod(null);
      resetForm();
      toast({
        title: "Success",
        description: "Payment method updated successfully",
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

  // Mutation for deleting payment method
  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) => {
      if (!user?.token) {
        throw new Error('Authentication required. Please log in again.');
      }
      return deletePaymentMethod(paymentMethodId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setIsDeleteDialogOpen(false);
      setDeletingPaymentMethod(null);
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
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
      isActive: true,
    });
    setIsSubmitting(false);
    setEditingPaymentMethod(null);
  };

  // Handle form submission (both create and edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started...');
    console.log('👤 Current user:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('✏️ Is editing:', !!editingPaymentMethod);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Form submission blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: editingPaymentMethod ? "Please log in to edit payment methods" : "Please log in to create payment methods",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      console.warn('❌ Form submission blocked: No payment method name');
      toast({
        title: "Validation Error",
        description: "Payment method name is required",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Starting form submission with data:', formData);
    setIsSubmitting(true);

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      isActive: formData.isActive,
    };

    console.log('📤 Submitting data to API...');
    
    if (editingPaymentMethod) {
      // Update existing payment method
      updatePaymentMethodMutation.mutate({ paymentMethodId: editingPaymentMethod.id, paymentMethodData: submitData });
    } else {
      // Create new payment method
      createPaymentMethodMutation.mutate(submitData);
    }
  };

  // Handle add payment method button click
  const handleAddPaymentMethod = () => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to create payment methods",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Authentication check passed, opening modal');
    setIsAddModalOpen(true);
  };

  // Handle edit payment method button click
  const handleEditPaymentMethod = (paymentMethod: any) => {
    console.log('🔍 Checking authentication state...');
    console.log('👤 User object:', user);
    console.log('🔑 Is authenticated:', isAuthenticated);
    console.log('🎫 Token exists:', !!user?.token);
    console.log('🎫 Token preview:', user?.token ? `${user.token.substring(0, 30)}...` : 'NO TOKEN');
    console.log('🔗 Payment method to edit:', paymentMethod);

    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Authentication check failed');
      toast({
        title: "Authentication Required",
        description: "Please log in to edit payment methods",
        variant: "destructive",
      });
      return;
    }

    setEditingPaymentMethod(paymentMethod);
    setFormData({
      name: paymentMethod.name,
      description: paymentMethod.description || '',
      isActive: paymentMethod.isActive,
    });
    setIsEditModalOpen(true);
  };

  // Handle delete payment method button click
  const handleDeletePaymentMethod = (paymentMethod: any) => {
    console.log('🔍 Delete payment method requested for:', paymentMethod.name);
    console.log('🔑 Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated || !user?.token) {
      console.warn('❌ Delete blocked: No authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to delete payment methods",
        variant: "destructive",
      });
      return;
    }
    
    setDeletingPaymentMethod(paymentMethod);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (!deletingPaymentMethod) return;
    
    console.log('🗑️ Confirming delete for payment method:', deletingPaymentMethod.name);
    deletePaymentMethodMutation.mutate(deletingPaymentMethod.id);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    if (!deletePaymentMethodMutation.isPending) {
      setIsDeleteDialogOpen(false);
      setDeletingPaymentMethod(null);
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

  if (!user || isLoading) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payment Methods</h1>
            <p className="text-muted-foreground">Manage payment methods</p>
          </div>
          <Button 
            className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddPaymentMethod}
          >
            <Plus size={16} className="mr-2" />
            Add Payment Method
          </Button>
        </div>
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error loading payment methods</h3>
          <p className="text-muted-foreground mt-2">
            Failed to connect to: /api/PaymentMethod
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground">
            Manage payment methods
            {pagination && (
              <span className="block sm:inline sm:ml-2">
                • {pagination.totalCount} total payment methods
              </span>
            )}
          </p>
        </div>
        <Button 
          className="bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
          onClick={handleAddPaymentMethod}
        >
          <Plus size={16} className="mr-2" />
          Add Payment Method
        </Button>
      </div>

      {paymentMethods && paymentMethods.length > 0 ? (
        <div className="grid gap-4">
          {paymentMethods.map((paymentMethod: any) => (
            <Card key={paymentMethod.id} className="shadow-admin-md hover:shadow-admin-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-primary-muted">
                      <div className="w-full h-full flex items-center justify-center">
                        <CreditCard className="text-primary" size={24} />
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div>
                        <h3 className="text-lg font-semibold break-words">{paymentMethod.name || 'Unnamed Payment Method'}</h3>
                        <p className="text-muted-foreground break-words">
                          {paymentMethod.description || 'No description available'}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        {paymentMethod.id && (
                          <div className="flex items-center gap-1">
                            <Hash size={14} />
                            <span className="break-all">ID: {paymentMethod.id}</span>
                          </div>
                        )}
                        <Badge variant={paymentMethod.isActive ? "default" : "secondary"}>
                          {paymentMethod.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {paymentMethod.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Created: {formatDate(paymentMethod.createdAt)}</span>
                          </div>
                        )}
                        {paymentMethod.updatedAt && paymentMethod.updatedAt !== paymentMethod.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Updated: {formatDate(paymentMethod.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleEditPaymentMethod(paymentMethod)}>
                      <Edit size={16} className="mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => handleDeletePaymentMethod(paymentMethod)}>
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
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No payment methods found</h3>
          <p className="text-muted-foreground mt-2">
            No payment methods are currently available. Create your first payment method to get started.
          </p>
          <Button 
            className="mt-4 bg-gradient-primary shadow-admin-sm hover:shadow-admin-md w-full sm:w-auto"
            onClick={handleAddPaymentMethod}
          >
            <Plus size={16} className="mr-2" />
            Add Payment Method
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
              Showing {paymentMethods.length} of {pagination.totalCount} payment methods
            </span>
          </div>
        </Card>
      )}

      {/* Add Payment Method Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Plus className="text-primary" size={24} />
              Add New Payment Method
            </DialogTitle>
            <DialogDescription>
              Create a new payment method to enable different payment options for your customers.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Payment Method Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="payment-method-name" className="text-sm font-medium">
                  Payment Method Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment-method-name"
                  type="text"
                  placeholder="Enter payment method name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="payment-method-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="payment-method-description"
                  placeholder="Enter payment method description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Active Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="is-active" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive payment methods won't be available to customers
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
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
                {isSubmitting ? 'Creating...' : 'Create Payment Method'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Edit className="text-primary" size={24} />
              Edit Payment Method
            </DialogTitle>
            <DialogDescription>
              Modify the details of the selected payment method.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {/* Payment Method Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="edit-payment-method-name" className="text-sm font-medium">
                  Payment Method Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-payment-method-name"
                  type="text"
                  placeholder="Enter payment method name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-payment-method-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="edit-payment-method-description"
                  placeholder="Enter payment method description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Active Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-is-active" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive payment methods won't be available to customers
                  </p>
                </div>
                <Switch
                  id="edit-is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
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
                {isSubmitting ? 'Updating...' : 'Update Payment Method'}
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
              Delete Payment Method
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPaymentMethod?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deletePaymentMethodMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletePaymentMethodMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePaymentMethodMutation.isPending ? 'Deleting...' : 'Delete Payment Method'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 