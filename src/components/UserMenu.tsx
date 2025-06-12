import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { auth } from '../lib/auth';
import type { AuthUser } from '../lib/auth';

interface UserMenuProps {
  user: AuthUser;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getDisplayName = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user.email.split('@')[0];
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getInitials()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{getDisplayName()}</p>
          <p className="text-xs text-primary-200">{user.email}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-primary-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                {getInitials()}
              </div>
              <div>
                <p className="font-medium text-neutral-900">{getDisplayName()}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to profile/settings if needed
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-neutral-50 transition-colors"
            >
              <User className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-700">Profile</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to settings if needed
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-neutral-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-700">Settings</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-neutral-200 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-error-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-error-500" />
              <span className="text-sm text-error-700">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};