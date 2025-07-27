import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  phone: string;
  token: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  currentStep: 'phone' | 'otp';
  pendingPhone: string;
  fetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get profile photo URL
const getProfilePhotoUrl = (profilePhoto: string | null) => {
  if (!profilePhoto) return null;
  const cleanPath = profilePhoto.startsWith('/') ? profilePhoto.substring(1) : profilePhoto;
  return `/api/files/${cleanPath}`;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'phone' | 'otp'>('phone');
  const [pendingPhone, setPendingPhone] = useState('');

  const login = async (phone: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      if (response.ok) {
        setPendingPhone(phone);
        setCurrentStep('otp');
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

  const verifyOtp = async (phone: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/Auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone, otp }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Full API Response from verify-otp:', data);
        console.log('🔍 Response structure:', Object.keys(data));
        console.log('🔍 Looking for token in data.token:', data.token);
        console.log('🔍 Looking for token in data.access_token:', data.access_token);
        console.log('🔍 Looking for token in data.accessToken:', data.accessToken);
        console.log('🔍 Looking for token in data.authToken:', data.authToken);
        console.log('🔍 Looking for token in data.jwt:', data.jwt);
        console.log('🔍 Looking for token in data.data:', data.data);
        
        // Try to find the token in different locations
        const token = data.token || data.access_token || data.accessToken || data.authToken || data.jwt || data.data?.token || data.data?.access_token || 
          (typeof data.data === 'string' ? data.data : null); // Handle case where data.data IS the token
        
        console.log('🎫 Found token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND');
        
        const userData = { phone, token: token };
        console.log('💾 Storing user data:', userData);
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentStep('phone');
        setPendingPhone('');
        
        // Fetch user profile information after successful login
        try {
          const profileResponse = await fetch('/api/Auth/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('🔍 Profile data received during login:', profileData);
            
            // Update user object with profile information
            const updatedUser = {
              ...userData,
              id: profileData.data?.id || profileData.id,
              firstName: profileData.data?.firstName || profileData.firstName,
              lastName: profileData.data?.lastName || profileData.lastName,
              email: profileData.data?.email || profileData.email,
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
      console.error('OTP verification error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setCurrentStep('phone');
    setPendingPhone('');
  };

  const fetchUserProfile = async () => {
    if (!user?.token) {
      console.warn('No token available for fetching profile');
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

      if (response.ok) {
        const profileData = await response.json();
        console.log('🔍 Profile data received:', profileData);
        
        // Update user object with profile information
        const updatedUser = {
          ...user,
          id: profileData.data?.id || profileData.id,
          firstName: profileData.data?.firstName || profileData.firstName,
          lastName: profileData.data?.lastName || profileData.lastName,
          email: profileData.data?.email || profileData.email,
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
    login,
    verifyOtp,
    logout,
    currentStep,
    pendingPhone,
    fetchUserProfile,
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