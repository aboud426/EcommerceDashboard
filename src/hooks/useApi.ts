import { useAuth } from '@/contexts/AuthContext';

// Custom hook for making authenticated API calls with automatic logout on token expiration
export const useApi = () => {
  const { logout, checkTokenExpiration, isTokenExpired } = useAuth();

  const apiCall = async (
    url: string,
    options: RequestInit = {},
    requiresAuth: boolean = true
  ) => {
    // Check token expiration before making the request
    if (requiresAuth) {
      checkTokenExpiration();
      
      if (isTokenExpired()) {
        console.warn('🔑 Token expired, cannot make API call');
        return null;
      }
    }

    try {
      // Get authentication headers if required
      let headers = { ...options.headers };
      
      if (requiresAuth) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user.token) {
            headers = {
              ...headers,
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            };
          }
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle authentication errors
      if ((response.status === 401 || response.status === 403) && requiresAuth) {
        console.warn('🔑 API call failed due to authentication error (401/403)');
        logout();
        return null;
      }

      return response;
    } catch (error) {
      console.error('API call failed:', error);
      return null;
    }
  };

  return { apiCall };
};

// Standalone function for components that don't use hooks
export const makeAuthenticatedCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | null> => {
  try {
    // Get token from localStorage
    const savedUser = localStorage.getItem('user');
    let headers = { ...options.headers };
    
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.token) {
        headers = {
          ...headers,
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        };
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors by triggering global logout
    if (response.status === 401 || response.status === 403) {
      console.warn('🔑 API call failed due to authentication error, triggering logout');
      
      // Use the global logout function if available
      if ((window as any).__authLogout) {
        (window as any).__authLogout();
      }
      
      return null;
    }

    return response;
  } catch (error) {
    console.error('Authenticated API call failed:', error);
    return null;
  }
};