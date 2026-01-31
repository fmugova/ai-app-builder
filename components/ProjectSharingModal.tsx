"use client";

import { useState, useEffect } from "react";
import { X, Share2, Link, Copy, Check, Globe, Lock } from "lucide-react";

interface ProjectSharingModalProps {
  project: {
    id: string;
    name: string;
    isPublic?: boolean;
    shareToken?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: { isPublic: boolean; shareToken?: string }) => void;
}

export default function ProjectSharingModal({
  project,
  isOpen,
  onClose,
  onUpdate,
}: ProjectSharingModalProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Update state when project changes
  useEffect(() => {
    if (project) {
      setIsPublic(project.isPublic || false);
      setShareToken(project.shareToken || "");
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : "";

  const handleToggleSharing = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsPublic(data.isPublic);
        if (data.shareToken) {
          setShareToken(data.shareToken);
        }
        onUpdate(data);
      } else {
        alert("Failed to update sharing settings");
      }
    } catch (error) {
      console.error("Error toggling sharing:", error);
      alert("Failed to update sharing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("This will invalidate the old share link. Continue?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareToken(data.shareToken);
        alert("New share link generated! ✨");
      }
    } catch (error) {
      console.error("Error regenerating token:", error);
      alert("Failed to regenerate link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Share Project
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sharing Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Lock className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {isPublic ? "Public" : "Private"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isPublic
                    ? "Anyone with the link can view"
                    : "Only you can access this project"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleSharing}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Share Link */}
          {isPublic && shareToken && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Share Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Link className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
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

              {/* Regenerate Token */}
              <button
                onClick={handleRegenerateToken}
                disabled={loading}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                Regenerate link (invalidates old link)
              </button>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Note:</strong> Shared projects are read-only. Others can view
              the code but cannot edit your project.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
