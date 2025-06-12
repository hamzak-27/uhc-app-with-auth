import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, History, Settings, FileText } from 'lucide-react';
import { UserMenu } from './UserMenu';
import type { AuthUser } from '../lib/auth';

interface LayoutProps {
  children: React.ReactNode;
  user: AuthUser | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Patient Search', href: '/', icon: Search },
    { name: 'Patient History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold font-grotesk">UHC Eligibility Interface</h1>
                <p className="text-primary-200 text-sm">Healthcare Eligibility Verification System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <nav className="flex space-x-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-700 text-white'
                          : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {user && <UserMenu user={user} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-neutral-500 text-sm">
            <p>© 2024 UHC Eligibility Interface. Professional Healthcare Management System.</p>
            <p className="mt-2">Built with modern web technologies for healthcare professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};