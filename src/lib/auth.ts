import { supabase } from './supabase';
import { msalInstance, loginRequest } from './msal-config';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    provider?: string;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private currentSession: Session | null = null;

  constructor() {
    // Initialize auth state
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        this.currentSession = session;
        this.currentUser = this.transformUser(session.user);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session) {
          this.currentSession = session;
          this.currentUser = this.transformUser(session.user);
        } else {
          this.currentSession = null;
          this.currentUser = null;
        }

        // Trigger custom event for components to listen to
        window.dispatchEvent(new CustomEvent('authStateChange', {
          detail: { user: this.currentUser, session: this.currentSession }
        }));
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    }
  }

  private transformUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata
    };
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match'
        };
      }

      // Validate password strength
      if (data.password.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long'
        };
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName || ''
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (authData.user) {
        return {
          success: true,
          user: this.transformUser(authData.user)
        };
      }

      return {
        success: false,
        error: 'Failed to create account'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during sign up'
      };
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (authData.user) {
        return {
          success: true,
          user: this.transformUser(authData.user)
        };
      }

      return {
        success: false,
        error: 'Failed to sign in'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during sign in'
      };
    }
  }

  async signInWithMicrosoft(): Promise<AuthResponse> {
    try {
      console.log('🔄 Starting Microsoft authentication...');
      
      // Check if MSAL is configured
      if (!import.meta.env.VITE_AZURE_CLIENT_ID || !import.meta.env.VITE_AZURE_TENANT_ID) {
        return {
          success: false,
          error: 'Microsoft authentication is not configured. Please check your environment variables.'
        };
      }

      // Handle any existing accounts
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }

      // Attempt silent login first
      let result: AuthenticationResult;
      try {
        result = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0] || undefined,
        });
        console.log('✅ Silent authentication successful');
      } catch (silentError) {
        console.log('🔄 Silent authentication failed, using interactive login');
        
        // If silent login fails, use interactive login
        try {
          result = await msalInstance.acquireTokenPopup(loginRequest);
          console.log('✅ Interactive authentication successful');
        } catch (interactiveError) {
          console.error('❌ Interactive authentication failed:', interactiveError);
          return {
            success: false,
            error: 'Microsoft authentication was cancelled or failed'
          };
        }
      }

      // Extract user information from Microsoft
      const account = result.account;
      if (!account) {
        return {
          success: false,
          error: 'Failed to get account information from Microsoft'
        };
      }

      console.log('📋 Microsoft account info:', {
        username: account.username,
        name: account.name,
        localAccountId: account.localAccountId
      });

      // Create or sign in user with Supabase using Microsoft account info
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: account.username,
        password: account.localAccountId // Use account ID as password for Microsoft users
      });

      if (error && error.message.includes('Invalid login credentials')) {
        // User doesn't exist, create them
        console.log('🔄 Creating new user for Microsoft account');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: account.username,
          password: account.localAccountId,
          options: {
            data: {
              full_name: account.name || account.username,
              provider: 'microsoft',
              microsoft_account_id: account.localAccountId
            }
          }
        });

        if (signUpError) {
          console.error('❌ Failed to create Microsoft user:', signUpError);
          return {
            success: false,
            error: this.getErrorMessage(signUpError)
          };
        }

        if (signUpData.user) {
          console.log('✅ Microsoft user created successfully');
          return {
            success: true,
            user: this.transformUser(signUpData.user)
          };
        }
      } else if (error) {
        console.error('❌ Microsoft sign in error:', error);
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (authData?.user) {
        console.log('✅ Microsoft user signed in successfully');
        return {
          success: true,
          user: this.transformUser(authData.user)
        };
      }

      return {
        success: false,
        error: 'Failed to authenticate with Microsoft'
      };

    } catch (error) {
      console.error('❌ Microsoft authentication error:', error);
      return {
        success: false,
        error: `Microsoft authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      // Sign out from Microsoft if user was authenticated via Microsoft
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          await msalInstance.logoutPopup({
            account: accounts[0],
            mainWindowRedirectUri: window.location.origin
          });
        }
      } catch (msalError) {
        console.warn('Microsoft logout failed:', msalError);
        // Don't fail the entire logout if Microsoft logout fails
      }

      this.currentUser = null;
      this.currentSession = null;

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during sign out'
      };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during password reset'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during password update'
      };
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }

  // Get Microsoft account info if available
  getMicrosoftAccount(): AccountInfo | null {
    try {
      const accounts = msalInstance.getAllAccounts();
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting Microsoft account:', error);
      return null;
    }
  }

  private getErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link';
      case 'User already registered':
        return 'An account with this email already exists';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long';
      default:
        return error.message || 'An authentication error occurred';
    }
  }
}

export const auth = new AuthService();