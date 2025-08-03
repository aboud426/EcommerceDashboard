import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  email: string;
  token: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchUserProfile: () => Promise<void>;
  checkTokenExpiration: () => void;
  isTokenExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get profile photo URL
const getProfilePhotoUrl = (profilePhoto: string | null) => {
  if (!profilePhoto) return null;
  const cleanPath = profilePhoto.startsWith('/') ? profilePhoto.substring(1) : profilePhoto;
  return `/api/files/${cleanPath}`;
};

// Helper function to decode JWT and check expiration
const isTokenExpired = (token: string): boolean => {
  try {
    // Decode JWT payload (without verification, just for expiration check)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const currentTime = Date.now() / 1000; // Convert to seconds
    
    // Check if token has expired (exp claim is in seconds)
    return payload.exp && payload.exp < currentTime;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return true; // Treat invalid tokens as expired
  }
};

// Global function to handle API responses and check for authentication errors
export const handleApiResponse = async (response: Response, onTokenExpired?: () => void) => {
  if (response.status === 401 || response.status === 403) {
    console.warn('🔑 Authentication failed (401/403), token may be expired');
    if (onTokenExpired) {
      onTokenExpired();
    }
  }
  return response;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    const userData = savedUser ? JSON.parse(savedUser) : null;
    
    // Check if token is expired on initialization
    if (userData?.token && isTokenExpired(userData.token)) {
      console.warn('🔑 Stored token is expired, clearing user data');
      localStorage.removeItem('user');
      return null;
    }
    
    return userData;
  });
  const [isLoading, setIsLoading] = useState(false);





  const logout = () => {
    console.log('🚪 Logging out user');
    setUser(null);
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  };

  const checkTokenExpiration = () => {
    if (user?.token && isTokenExpired(user.token)) {
      console.warn('🔑 Token has expired, logging out user');
      logout();
    }
  };

  const isUserTokenExpired = (): boolean => {
    return user?.token ? isTokenExpired(user.token) : true;
  };

  // Periodically check token expiration (every 5 minutes)
  useEffect(() => {
    if (user?.token) {
      const interval = setInterval(() => {
        checkTokenExpiration();
      }, 5 * 60 * 1000); // Check every 5 minutes

      // Initial check
      checkTokenExpiration();

      return () => clearInterval(interval);
    }
  }, [user?.token]);

  // Set up global API response handler
  useEffect(() => {
    // Store the logout function globally so API calls can trigger it
    (window as any).__authLogout = logout;
    
    return () => {
      delete (window as any).__authLogout;
    };
  }, []);

  // Enhanced login function with automatic logout handling
  const loginWithExpirationHandling = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/Auth/email-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Handle potential authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('🔑 Login failed due to invalid credentials');
        return false;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Full API Response from email-login:', data);
        console.log('🔍 Response structure:', Object.keys(data));
        
        // Try to find the token in different locations
        const token = data.token || data.access_token || data.accessToken || data.authToken || data.jwt || data.data?.token || data.data?.access_token || 
          (typeof data.data === 'string' ? data.data : null); // Handle case where data.data IS the token
        
        console.log('🎫 Found token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND');
        
        // Check if the received token is already expired
        if (token && isTokenExpired(token)) {
          console.error('🔑 Received token is already expired');
          return false;
        }
        
        const userData = { email, token: token };
        console.log('💾 Storing user data:', userData);
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ User state set successfully, isAuthenticated should now be true');
        
        // Fetch user profile information after successful login
        try {
          const profileResponse = await fetch('/api/Auth/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          // Handle authentication errors in profile fetch
          if (profileResponse.status === 401 || profileResponse.status === 403) {
            console.warn('🔑 Profile fetch failed due to authentication error');
            logout();
            return false;
          }

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('🔍 Profile data received during login:', profileData);
            
            // Update user object with profile information
            const updatedUser = {
              ...userData,
              id: profileData.data?.id || profileData.id,
              firstName: profileData.data?.firstName || profileData.firstName,
              lastName: profileData.data?.lastName || profileData.lastName,
              profilePhoto: profileData.data?.profilePhoto || profileData.profilePhoto,
            };

            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('✅ User profile updated during login');
          }
        } catch (profileError) {
          console.warn('Could not fetch profile during login:', profileError);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.token) {
      console.warn('No token available for fetching profile');
      return;
    }

    // Check if token is expired before making the request
    if (isTokenExpired(user.token)) {
      console.warn('🔑 Token is expired, cannot fetch profile');
      logout();
      return;
    }

    try {
      // Try to fetch current user profile information
      const response = await fetch('/api/Auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('🔑 Profile fetch failed due to authentication error, logging out');
        logout();
        return;
      }

      if (response.ok) {
        const profileData = await response.json();
        console.log('🔍 Profile data received:', profileData);
        
        // Update user object with profile information
        const updatedUser = {
          ...user,
          id: profileData.data?.id || profileData.id,
          firstName: profileData.data?.firstName || profileData.firstName,
          lastName: profileData.data?.lastName || profileData.lastName,
          profilePhoto: profileData.data?.profilePhoto || profileData.profilePhoto,
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ User profile updated successfully');
      } else {
        console.warn('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: loginWithExpirationHandling,
    logout,
    fetchUserProfile,
    checkTokenExpiration,
    isTokenExpired: isUserTokenExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 