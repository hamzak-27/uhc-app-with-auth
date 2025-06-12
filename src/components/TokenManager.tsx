import React, { useState, useEffect } from 'react';
import { Key, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { uhcApi } from '../lib/uhc-api-backend';

export const TokenManager: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<{
    token: string | null;
    expires: Date | null;
    isValid: boolean;
  }>({ token: null, expires: null, isValid: false });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  // Update token info and timer
  useEffect(() => {
    const updateTokenInfo = () => {
      const info = uhcApi.getTokenInfo();
      setTokenInfo(info);
      
      if (info.expires) {
        const now = new Date();
        const timeLeft = info.expires.getTime() - now.getTime();
        
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining('Expired');
        }
      } else {
        setTimeRemaining('');
      }
    };

    // Load stored token on mount
    uhcApi.loadStoredToken();
    updateTokenInfo();

    // Update every second
    const interval = setInterval(updateTokenInfo, 1000);
    return () => clearInterval(interval);
  }, [lastGenerated]);

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    
    try {
      const result = await uhcApi.generateToken();
      
      if (result.success) {
        setLastGenerated(new Date());
        setTokenInfo({
          token: result.token || null,
          expires: result.expires_at || null,
          isValid: true
        });
      } else {
        console.error('Token generation failed:', result.error);
        alert(`Failed to generate token: ${result.error}`);
      }
    } catch (error) {
      console.error('Token generation error:', error);
      alert('An unexpected error occurred while generating the token');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearToken = () => {
    uhcApi.clearStoredToken();
    setTokenInfo({ token: null, expires: null, isValid: false });
    setTimeRemaining('');
    setLastGenerated(null);
  };

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Key className="w-5 h-5 text-primary-800" />
          <h3 className="text-lg font-semibold font-grotesk">OAuth Token Status</h3>
        </div>
        
        {tokenInfo.isValid && (
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-primary-600" />
            <span className="font-mono text-primary-800">
              {timeRemaining}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${
            tokenInfo.isValid 
              ? 'bg-success-50 text-success-700' 
              : 'bg-error-50 text-error-700'
          }`}>
            {tokenInfo.isValid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="font-medium">
              {tokenInfo.isValid ? 'Valid' : 'Invalid/Expired'}
            </span>
          </div>
        </div>
        
        {tokenInfo.expires && (
          <div className="text-center">
            <p className="text-sm text-neutral-500 mb-1">Expires At</p>
            <p className="font-mono text-sm text-neutral-900">
              {tokenInfo.expires.toLocaleTimeString()}
            </p>
          </div>
        )}
        
        {lastGenerated && (
          <div className="text-center">
            <p className="text-sm text-neutral-500 mb-1">Generated At</p>
            <p className="font-mono text-sm text-neutral-900">
              {lastGenerated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleGenerateToken}
          disabled={isGenerating}
          className="btn-primary flex items-center space-x-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Key className="w-4 h-4" />
              <span>Generate OAuth Token</span>
            </>
          )}
        </button>
        
        {tokenInfo.token && (
          <button
            onClick={handleClearToken}
            className="btn-secondary"
          >
            Clear Token
          </button>
        )}
      </div>

      {tokenInfo.isValid && (
        <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg">
          <p className="text-success-700 text-sm">
            ✅ Token is active and ready for API requests. 
            {timeRemaining && timeRemaining !== 'Expired' && (
              <span> Automatically expires in {timeRemaining}.</span>
            )}
          </p>
        </div>
      )}

      {!tokenInfo.isValid && (
        <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <p className="text-warning-700 text-sm">
            ⚠️ No valid token available. Generate a token to perform API searches.
          </p>
        </div>
      )}
    </div>
  );
};