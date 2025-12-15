"use client"

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div className="absolute right-0 top-0 h-full w-64 bg-gray-900 p-4">
            <button 
              onClick={() => setIsOpen(false)}
              className="mb-4"
            >
              <X className="w-6 h-6" />
            </button>
            
            <nav className="space-y-2">
              <button className="w-full text-left p-3 rounded hover:bg-gray-800">
                Desktop
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800">
                Tablet
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800">
                Mobile
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800">
                Refresh
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800">
                View Code
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800 text-blue-400">
                Contact Support
              </button>
              <button className="w-full text-left p-3 rounded hover:bg-gray-800 text-red-400">
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}