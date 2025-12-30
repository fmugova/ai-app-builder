"use client"

import { Menu, X, Home, FolderOpen, Settings, Mail, LogOut, Plus } from 'lucide-react';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function DashboardMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Add explicit hash navigation handler
  const handleNavClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    window.location.hash = to === '/' ? '' : to;
    setIsOpen(false);
  };

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
        <Menu className="w-6 h-6 text-white" />
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
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Menu Items */}
            <nav className="space-y-2">
              {/* New Project */}
              <button 
                onClick={() => handleAction(() => router.push('/builder'))}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-left text-white font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>

              <div className="my-4 border-t border-gray-700"></div>

              {/* Navigation */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-2">Navigation</p>
                <button 
                  onClick={(e) => handleNavClick(e, '/dashboard')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-white"
                >
                  <Home className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button 
                  onClick={(e) => handleNavClick(e, '/projects')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-white"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span>My Projects</span>
                </button>
                <button 
                  onClick={(e) => handleNavClick(e, '/settings')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-white"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="my-4 border-t border-gray-700"></div>

              {/* Support */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-2">Support</p>
                <a 
                  href="/contact"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-left text-blue-400"
                  onClick={(e) => handleNavClick(e, '/contact')}
                >
                  <Mail className="w-5 h-5" />
                  <span>Contact Support</span>
                </a>
              </div>

              <div className="my-4 border-t border-gray-700"></div>

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