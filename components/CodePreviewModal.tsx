"use client";

import { useState } from "react";
import { X, Copy, Check, Download, Eye, Code, Maximize2 } from "lucide-react";

interface CodePreviewModalProps {
  project: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

export default function CodePreviewModal({
  project,
  isOpen,
  onClose,
  onEdit,
}: CodePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !project) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(project.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([project.code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.jsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = project.code.split("\n").length;
  const charCount = project.code.length;
  const wordCount = project.code.split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
          isFullscreen
            ? "w-full h-full"
            : "max-w-6xl w-full max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {project.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.type} • {lineCount} lines • {wordCount} words • {charCount} chars
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              title="Copy code"
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
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              title="Download code"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                title="Edit in builder"
              >
                <Eye className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-hidden flex">
          {/* Line Numbers */}
          <div className="bg-gray-800 text-gray-500 p-4 font-mono text-sm select-none overflow-auto">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-right pr-4">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Content */}
          <div className="flex-1 bg-gray-900 overflow-auto">
            <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre">
              <code>{project.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Language: JSX/React</span>
            <span>•</span>
            <span>Tab Size: 2 spaces</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{lineCount} lines</span>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{(charCount / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </div>
    </div>
  );
}