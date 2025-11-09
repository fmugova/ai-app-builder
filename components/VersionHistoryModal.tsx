"use client";

import { useState, useEffect } from "react";
import { X, Clock, RotateCcw, Eye, Download } from "lucide-react";

interface Version {
  id: string;
  version: number;
  code: string;
  description?: string;
  createdAt: string;
}

interface VersionHistoryModalProps {
  project: {
    id: string;
    name: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (versionId: string) => void;
}

export default function VersionHistoryModal({
  project,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      fetchVersions();
    }
  }, [isOpen, project?.id]);

  const fetchVersions = async () => {
    if (!project) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!project) return;
    if (!confirm("Restore this version? This will create a new version.")) return;

    try {
      const response = await fetch(
        `/api/projects/${project.id}/versions/${versionId}/restore`,
        { method: "POST" }
      );

      if (response.ok) {
        alert("Version restored successfully! ✨");
        onRestore?.(versionId);
        fetchVersions();
      } else {
        alert("Failed to restore version");
      }
    } catch (error) {
      console.error("Error restoring version:", error);
      alert("Failed to restore version");
    }
  };

  const handleDownloadVersion = (version: Version) => {
    if (!project) return;
    
    const blob = new Blob([version.code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-v${version.version}.jsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Version History
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
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded">
                          v{version.version}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(version.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {version.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {version.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowCodePreview(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleRestore(version.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDownloadVersion(version)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Version History
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Versions are automatically saved when you update your project.
              </p>
            </div>
          )}
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

      {/* Code Preview Modal */}
      {showCodePreview && selectedVersion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Version {selectedVersion.version} - Code Preview
              </h3>
              <button
                onClick={() => setShowCodePreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {selectedVersion.code}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}