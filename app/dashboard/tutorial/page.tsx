"use client";

import { useState } from "react";

export default function DashboardTutorial() {
  const [showTips, setShowTips] = useState(true);

  const tips = [
    {
      title: "Welcome to Your Dashboard!",
      content: "Here you can manage your projects, view analytics, and access all your tools in one place."
    },
    {
      title: "Quick Actions",
      content: "Use the quick actions panel to create new projects, import code, or access templates instantly."
    },
    {
      title: "Live Analytics",
      content: "Monitor your project performance and user activity in real time from the analytics section."
    },
    {
      title: "Need Help?",
      content: "Click the help icon in the top right for documentation, support, and video tutorials."
    }
  ];

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Dashboard Tutorial</h1>
      <p className="mb-8 text-gray-600">Get started with your dashboard using these quick tips. You can close the pop-up advice at any time.</p>
      {showTips && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowTips(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              title="Close tutorial"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4 text-purple-700">Dashboard Quick Tips</h2>
            <ul className="space-y-4">
              {tips.map((tip, idx) => (
                <li key={idx} className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                  <div className="font-semibold text-purple-800 mb-1">{tip.title}</div>
                  <div className="text-gray-700 text-sm">{tip.content}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">How to Use the Dashboard</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Navigate between sections using the sidebar or top navigation.</li>
          <li>Click "New Project" to start building instantly.</li>
          <li>Access analytics and settings from the dashboard menu.</li>
          <li>Use the help icon for documentation and support.</li>
        </ol>
      </div>
    </div>
  );
}
