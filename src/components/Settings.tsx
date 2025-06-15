import React from 'react';
import { Settings as SettingsIcon, Key, Shield, Info, Users } from 'lucide-react';
import { auth } from '../lib/auth';

export const Settings: React.FC = () => {
  const currentUser = auth.getCurrentUser();
  const microsoftAccount = auth.getMicrosoftAccount();

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-grotesk text-neutral-900 flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-primary-800" />
          <span>Settings</span>
        </h1>
        <p className="text-neutral-600 mt-2">Application configuration and information</p>
      </div>

      {/* User Account Information */}
      <div className="card p-8">
        <h2 className="text-xl font-semibold font-grotesk mb-6 flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary-800" />
          <span>Account Information</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              type="text"
              value={currentUser?.email || 'Not signed in'}
              className="input-field bg-neutral-50"
              disabled
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={currentUser?.user_metadata?.full_name || 'Not provided'}
              className="input-field bg-neutral-50"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Authentication Provider
            </label>
            <input
              type="text"
              value={currentUser?.user_metadata?.provider === 'microsoft' ? 'Microsoft Authenticator' : 'Email/Password'}
              className="input-field bg-neutral-50"
              disabled
              readOnly
            />
          </div>

          {microsoftAccount && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Microsoft Account
              </label>
              <input
                type="text"
                value={microsoftAccount.name || microsoftAccount.username}
                className="input-field bg-neutral-50"
                disabled
                readOnly
              />
            </div>
          )}
        </div>

        {currentUser?.user_metadata?.provider === 'microsoft' && (
          <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <h3 className="font-medium text-primary-800 mb-2">Microsoft Authentication</h3>
            <p className="text-primary-700 text-sm">
              Your account is authenticated through Microsoft Authenticator. This provides enhanced security 
              and seamless integration with your organization's identity management system.
            </p>
          </div>
        )}
      </div>

      {/* UHC API Configuration */}
      <div className="card p-8">
        <h2 className="text-xl font-semibold font-grotesk mb-6 flex items-center space-x-2">
          <Key className="w-5 h-5 text-primary-800" />
          <span>UHC API Configuration</span>
        </h2>
        
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-success-600 mt-0.5" />
            <div>
              <p className="text-success-800 font-medium">Credentials Securely Configured</p>
              <p className="text-success-700 text-sm mt-1">
                UHC API credentials are configured via environment variables for security. 
                Simply generate an OAuth token to begin making API requests.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              UHC Client ID
            </label>
            <input
              type="text"
              value="Configured via environment variable"
              className="input-field bg-neutral-50"
              disabled
              readOnly
            />
            <p className="text-xs text-neutral-500 mt-1">
              Set via UHC_CLIENT_ID environment variable
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              UHC Client Secret
            </label>
            <input
              type="password"
              value="••••••••••••••••••••••••••••••••"
              className="input-field bg-neutral-50"
              disabled
              readOnly
            />
            <p className="text-xs text-neutral-500 mt-1">
              Set via UHC_CLIENT_SECRET environment variable (secured)
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <h3 className="font-medium text-primary-800 mb-2">Environment Variables</h3>
          <ul className="text-primary-700 text-sm space-y-1">
            <li>• <code className="bg-white px-1 rounded">UHC_CLIENT_ID</code> - Your UHC API client identifier</li>
            <li>• <code className="bg-white px-1 rounded">UHC_CLIENT_SECRET</code> - Your UHC API client secret</li>
            <li>• <code className="bg-white px-1 rounded">VITE_BACKEND_URL</code> - Backend server URL (optional)</li>
            <li>• <code className="bg-white px-1 rounded">VITE_AZURE_CLIENT_ID</code> - Microsoft Azure client ID</li>
            <li>• <code className="bg-white px-1 rounded">VITE_AZURE_TENANT_ID</code> - Microsoft Azure tenant ID</li>
            <li>• Create a <code className="bg-white px-1 rounded">.env</code> file in the project root for local development</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-medium text-amber-800 mb-2">OAuth Token Management</h3>
          <ul className="text-amber-700 text-sm space-y-1">
            <li>• Tokens are automatically generated using the configured credentials</li>
            <li>• Each token is valid for 60 minutes (3600 seconds)</li>
            <li>• Tokens are automatically refreshed when needed for API requests</li>
            <li>• A countdown timer shows remaining token validity</li>
          </ul>
        </div>
      </div>

      {/* Application Information */}
      <div className="card p-8">
        <h2 className="text-xl font-semibold font-grotesk mb-6 flex items-center space-x-2">
          <Info className="w-5 h-5 text-primary-800" />
          <span>Application Information</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">Environment</h3>
            <p className="text-neutral-600">Production UHC API</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">Version</h3>
            <p className="text-neutral-600">1.0.0</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">API Endpoints</h3>
            <p className="text-neutral-600 text-sm">
              Eligibility: v3.0<br />
              Coverage Details: v5.0<br />
              Member Card: v3.0
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">Database</h3>
            <p className="text-neutral-600">Supabase (PostgreSQL)</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">Token Expiry</h3>
            <p className="text-neutral-600">60 minutes (auto-refresh)</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-900 mb-2">Features</h3>
            <p className="text-neutral-600 text-sm">
              Patient Search<br />
              History Tracking<br />
              PDF Export<br />
              Member Card Retrieval<br />
              Microsoft Authentication
            </p>
          </div>
        </div>
      </div>

      {/* Security Information */}
      <div className="card p-8">
        <h2 className="text-xl font-semibold font-grotesk mb-6">Security & Privacy</h2>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-neutral-900">Data Protection</h3>
              <p className="text-neutral-600 text-sm">
                All patient data is securely stored in encrypted database with row-level security enabled.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Key className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-neutral-900">API Security</h3>
              <p className="text-neutral-600 text-sm">
                OAuth tokens are automatically managed and refreshed. All API communications use HTTPS.
                Credentials are stored as environment variables, never in source code.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-neutral-900">Microsoft Authentication</h3>
              <p className="text-neutral-600 text-sm">
                Secure authentication through Microsoft Authenticator provides enterprise-grade security
                with multi-factor authentication and conditional access policies.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-neutral-900">Compliance</h3>
              <p className="text-neutral-600 text-sm">
                Application follows healthcare data handling best practices and UHC API guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};