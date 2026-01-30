/**
 * Authentication hook for managing user session state
 * Provides consistent auth checking across the application
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  userId: string | null;
  userEmail: string;
  displayName: string;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UseAuthOptions {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { redirectOnUnauthenticated = true, redirectPath = '/auth' } = options;
  const navigate = useNavigate();
  
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    userEmail: '',
    displayName: '',
    isLoading: true,
    isAuthenticated: false,
  });

  const checkSession = useCallback(async () => {
    try {
      // Use getSession() which is cached and faster than getUser()
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        if (redirectOnUnauthenticated) {
          navigate(redirectPath);
        }
        setAuthState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
        return;
      }

      const user = session.user;

      // Fetch profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      setAuthState({
        userId: user.id,
        userEmail: user.email || '',
        displayName: profile?.display_name || '',
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      if (redirectOnUnauthenticated) {
        navigate(redirectPath);
      }
    }
  }, [navigate, redirectOnUnauthenticated, redirectPath]);

  useEffect(() => {
    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && redirectOnUnauthenticated) {
        navigate(redirectPath);
      } else if (session) {
        checkSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSession, navigate, redirectOnUnauthenticated, redirectPath]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  return {
    ...authState,
    logout,
    updatePassword,
    refreshSession: checkSession,
  };
};
