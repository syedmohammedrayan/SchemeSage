import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { auth as firebaseAuth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  state: string;
  district: string;
  role: 'citizen' | 'admin' | 'government' | 'agent';
  age?: number;
  gender?: string;
  occupation?: string;
  annualIncome?: number;
  category?: string;
  avatarUrl?: string;
  address?: string;
  createdAt?: string;
  // Agent-specific fields
  expertise?: string;
  status?: string;
  aadharNumber?: string;
  panNumber?: string;
  meeSevaId?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, loginRole?: string) => Promise<UserProfile>;
  register: (data: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    state: string;
    district: string;
    role?: 'citizen' | 'admin' | 'government';
    aadharNumber?: string;
    panNumber?: string;
    meeSevaId?: string;
    address?: string;
    expertise?: string;
  }) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First, check if there was a redirect login
    getRedirectResult(firebaseAuth).then(async (result) => {
      if (result && result.user) {
        const idToken = await result.user.getIdToken();
        const data = await api.post<{ token: string; user: UserProfile }>('/auth/google', {
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
    }).catch(console.error).finally(() => {
      if (token) {
        api.get<{ user: UserProfile }>('/auth/me')
          .then(data => setUser(data.user))
          .catch(() => {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email: string, password: string, loginRole?: string) => {
    const data = await api.post<{ token: string; user: UserProfile }>('/auth/login', { email, password, loginRole });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (fullData: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    state: string;
    district: string;
    role?: 'citizen' | 'admin' | 'government';
    aadharNumber?: string;
    panNumber?: string;
    meeSevaId?: string;
    address?: string;
    expertise?: string;
  }) => {
    const { role = 'citizen', ...formData } = fullData;
    try {
      const data = await api.post<{ token?: string; user?: UserProfile; message?: string }>('/auth/register', {
        ...formData,
        role,
      });

      // Only set session if a token is provided (citizen flow)
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
      }
      
      return null as any; 
    } catch (err: any) {
      console.error('[Registration Error]', err);
      throw err; // Ensure UI can catch and display the specific backend error
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      
      let result;
      try {
        result = await signInWithPopup(firebaseAuth, provider);
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked') {
          await signInWithRedirect(firebaseAuth, provider);
          return null as any; // Execution stops here, page redirects
        }
        throw err;
      }

      const idToken = await result.user.getIdToken();
      
      const data = await api.post<{ token: string; user: UserProfile }>('/auth/google', {
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      }, {
        headers: { Authorization: `Bearer ${idToken}` } // Send it specifically for this request
      });

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Google Login Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseAuth.signOut();
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.get<{ user: UserProfile }>('/auth/me');
      setUser(data.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
