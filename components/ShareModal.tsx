'use client';

import { useState } from 'react';
import { X, Twitter, Linkedin, Copy, Code, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  publicUrl: string;
  views?: number;
}

export default function ShareModal({
  isOpen,
  onClose,
  projectName,
  publicUrl,
  views = 0,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  if (!isOpen) return null;

  const embedCode = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" sandbox="allow-scripts"></iframe>`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareOnTwitter = () => {
    const text = `Check out my project: ${projectName}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Share Your Project</h2>
              <p className="text-blue-100 text-sm mt-1">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{views}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm text-gray-600">Published</div>
            </div>
          </div>

          {/* Public URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
              />
              <button
                onClick={() => copyToClipboard(publicUrl)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <span className="text-sm">✓</span>
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Sharing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Share on Social Media
            </label>
            <div className="flex gap-3">
              <button
                onClick={shareOnTwitter}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors"
              >
                <Twitter className="w-5 h-5" />
                Twitter
              </button>
              <button
                onClick={shareOnLinkedIn}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors"
              >
                <Linkedin className="w-5 h-5" />
                LinkedIn
              </button>
            </div>
          </div>

          {/* Visit Site */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Visit Live Site
          </a>

          {/* Embed Code (Optional) */}
          <div>
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Code className="w-4 h-4" />
              {showEmbed ? 'Hide' : 'Show'} Embed Code
            </button>

            {showEmbed && (
              <div className="mt-3">
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(embedCode)}
                    className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
