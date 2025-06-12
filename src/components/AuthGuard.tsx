import React, { useState, useEffect } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { auth } from '../lib/auth';
import { AuthModal } from './AuthModal';
import type { AuthUser } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check initial auth state
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // Listen for auth state changes
    const handleAuthStateChange = (event: CustomEvent) => {
      const { user: newUser } = event.detail;
      setUser(newUser);
      setIsLoading(false);
    };

    window.addEventListener('authStateChange', handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener('authStateChange', handleAuthStateChange as EventListener);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-800 mx-auto mb-4" />
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="card p-8 text-center">
            <Shield className="w-12 h-12 text-primary-800 mx-auto mb-4" />
            <h1 className="text-2xl font-bold font-grotesk text-neutral-900 mb-2">
              Authentication Required
            </h1>
            <p className="text-neutral-600 mb-6">
              Please sign in to access the UHC Eligibility Interface
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-primary w-full"
            >
              Sign In
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      </div>
    );
  }

  return <>{children}</>;
};