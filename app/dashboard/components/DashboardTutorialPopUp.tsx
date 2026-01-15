// DashboardTutorialPopUp.tsx
"use client";
import { useState } from "react";

export default function DashboardTutorialPopUp() {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="bg-white border border-purple-300 shadow-lg rounded-xl p-6 max-w-xs w-full relative">
        <button
          onClick={() => setShow(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          title="Close advice"
        >
          ×
        </button>
        <h3 className="text-lg font-bold text-purple-700 mb-2">Need a hand?</h3>
        <ul className="text-sm text-gray-700 space-y-2 mb-2">
          <li>• Use the sidebar to switch sections</li>
          <li>• Click "New Project" to start</li>
          <li>• Access analytics and settings anytime</li>
        </ul>
        <div className="text-xs text-gray-400">You can always reopen this from the help menu.</div>
      </div>
    </div>
  );
}
