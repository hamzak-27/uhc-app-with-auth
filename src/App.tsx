import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msal-config';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { PatientSearch } from './pages/PatientSearch';
import { PatientHistory } from './components/PatientHistory';
import { PatientDetail } from './components/PatientDetail';
import { Settings } from './components/Settings';
import { AuthCallback } from './pages/AuthCallback';
import { ResetPassword } from './pages/ResetPassword';
import { auth } from './lib/auth';
import type { AuthUser } from './lib/auth';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Initialize user state
    setUser(auth.getCurrentUser());

    // Listen for auth state changes
    const handleAuthStateChange = (event: CustomEvent) => {
      const { user: newUser } = event.detail;
      setUser(newUser);
    };

    window.addEventListener('authStateChange', handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener('authStateChange', handleAuthStateChange as EventListener);
    };
  }, []);

  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <AuthGuard>
              <Layout user={user}>
                <Routes>
                  <Route path="/" element={<PatientSearch />} />
                  <Route path="/history" element={<PatientHistory />} />
                  <Route path="/patient/:id" element={<PatientDetail />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </AuthGuard>
          } />
        </Routes>
      </Router>
    </MsalProvider>
  );
}

export default App;