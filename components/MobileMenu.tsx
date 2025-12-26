"use client"

import { Menu, X, Monitor, Tablet, Smartphone, RefreshCw, Code, LogOut, Mail, ChevronRight, HelpCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

interface MobileMenuProps {
  onViewChange?: (view: 'desktop' | 'tablet' | 'mobile') => void;
  onRefresh?: () => void;
  onViewCode?: () => void;
  currentView?: 'desktop' | 'tablet' | 'mobile';
}

export function MobileMenu({ onViewChange, onRefresh, onViewCode, currentView = 'desktop' }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Trap focus, Esc-to-close, and lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      document.addEventListener('keydown', onKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.overflow = prevOverflow;
        triggerRef.current?.focus();
      };
    }
  }, [isOpen]);

  const handleAction = (action: () => void | Promise<void>) => {
    action();
    setIsOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefresh?.());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="lg:hidden p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg transition active:bg-gray-600 dark:active:bg-gray-700"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        title="Open menu"
        type="button"
      >
        <Menu className="w-6 h-6 text-gray-200" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            role="presentation"
            aria-hidden="true"
          />
          
          {/* Slide-out Menu */}
          <div
            className="fixed right-0 top-0 h-full w-72 bg-gray-900 border-l border-gray-800 z-50 p-6 overflow-y-auto lg:hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                ref={closeRef}
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition active:bg-gray-700"
                aria-label="Close menu"
                title="Close menu"
                type="button"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            
            {/* Menu Items */}
            <nav className="space-y-1">
              {/* View Options Section */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3 px-3">Preview</p>
                
                <div className="space-y-1.5">
                  {[
                    { id: 'desktop', label: 'Desktop', icon: Monitor, desc: '1920px' },
                    { id: 'tablet', label: 'Tablet', icon: Tablet, desc: '768px' },
                    { id: 'mobile', label: 'Mobile', icon: Smartphone, desc: '375px' }
                  ].map(({ id, label, icon: Icon, desc }) => {
                    const isActive = currentView === id;
                    return (
                      <button 
                        key={id}
                        onClick={() => {
                          onViewChange?.(id as 'desktop' | 'tablet' | 'mobile');
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
                          isActive 
                            ? 'bg-purple-600/20 border border-purple-500 text-purple-400' 
                            : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                        } active:bg-gray-700`}
                        aria-pressed={isActive}
                        title={`Switch to ${label} view`}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium text-sm">{label}</div>
                            <div className="text-xs text-gray-500">{desc}</div>
                          </div>
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions Section */}
              <div className="mb-6 border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3 px-3">Actions</p>
                
                <button 
                  onClick={() => handleAction(handleRefresh)}
                  disabled={isRefreshing}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-700"
                  title="Refresh preview"
                  type="button"
                >
                  <RefreshCw className={`w-5 h-5 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                
                <button 
                  onClick={() => handleAction(() => onViewCode?.())}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white active:bg-gray-700"
                  title="View source code"
                  type="button"
                >
                  <Code className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">View Code</span>
                </button>
              </div>

              {/* Help Section */}
              <div className="mb-6 border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3 px-3">Help</p>
                
                <a 
                  href="/help"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white active:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                  title="View help documentation"
                >
                  <HelpCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Help & Docs</span>
                </a>
                
                <a
                  href="mailto:support@buildflow-ai.app"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white active:bg-gray-700"
                  title="Contact support"
                  onClick={() => setIsOpen(false)}
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Contact Support</span>
                </a>
              </div>

              {/* Sign Out Section */}
              <div className="border-t border-gray-800 pt-4">
                <button 
                  onClick={() => handleAction(() => signOut({ callbackUrl: '/' }))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/20 transition text-red-400 hover:text-red-300 active:bg-red-900/30"
                  title="Sign out of your account"
                  type="button"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}