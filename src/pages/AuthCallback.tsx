import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Redirect to main app after a short delay
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No session found. Please try signing in again.');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const handleRetry = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary-800 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-grotesk text-neutral-900 mb-2">
                Authenticating
              </h1>
              <p className="text-neutral-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-success-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-grotesk text-neutral-900 mb-2">
                Success!
              </h1>
              <p className="text-neutral-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-error-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-grotesk text-neutral-900 mb-2">
                Authentication Error
              </h1>
              <p className="text-neutral-600 mb-6">{message}</p>
              <button
                onClick={handleRetry}
                className="btn-primary w-full"
              >
                Continue to App
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};