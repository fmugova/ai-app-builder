"use client"

"use client"

import { Menu, X, Monitor, Tablet, Smartphone, RefreshCw, Code, LogOut, Mail } from 'lucide-react';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

interface MobileMenuProps {
  onViewChange?: (view: 'desktop' | 'tablet' | 'mobile') => void;
  onRefresh?: () => void;
  onViewCode?: () => void;
}

export function MobileMenu({ onViewChange, onRefresh, onViewCode }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Slide-out Menu */}
          <div className="fixed right-0 top-0 h-full w-72 bg-gray-900 z-50 p-6 overflow-y-auto lg:hidden">
            {/* Close Button */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Menu Items */}
            <nav className="space-y-2">
              {/* View Options */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-2">View</p>
                <button 
                  onClick={() => handleAction(() => onViewChange?.('desktop'))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <Monitor className="w-5 h-5" />
                  <span>Desktop</span>
                </button>
                <button 
                  onClick={() => handleAction(() => onViewChange?.('tablet'))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <Tablet className="w-5 h-5" />
                  <span>Tablet</span>
                </button>
                <button 
                  onClick={() => handleAction(() => onViewChange?.('mobile'))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Actions */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-2">Actions</p>
                <button 
                  onClick={() => handleAction(() => onRefresh?.())}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh</span>
                </button>
                <button 
                  onClick={() => handleAction(() => onViewCode?.())}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <Code className="w-5 h-5" />
                  <span>View Code</span>
                </button>
              </div>

              {/* Support */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-2">Support</p>
                <a 
                  href="/contact"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-blue-400"
                  onClick={() => setIsOpen(false)}
                >
                  <Mail className="w-5 h-5" />
                  <span>Contact Support</span>
                </a>
              </div>

              {/* Sign Out */}
              <button 
                onClick={() => handleAction(() => signOut())}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}