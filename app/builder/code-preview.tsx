'use client';

import { sanitizeForPreview } from '@/lib/sanitizeForPreview';
import { toast } from 'react-hot-toast';

interface CodePreviewProps {
  code: string;
  projectId: string | null;
  isLoadedProject: boolean;
  onRegenerate: () => void;
  onSave: () => void;
  onDownload: () => void;
  saving: boolean;
}

export default function CodePreview({
  code,
  projectId,
  isLoadedProject,
  onRegenerate,
  onSave,
  onDownload,
  saving,
}: CodePreviewProps) {
  if (isLoadedProject) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">👁️</div>
          <h4 className="text-lg font-semibold mb-2">Project Loaded</h4>
          <p className="text-gray-600 mb-6">Click below to open preview in new tab</p>
          <button
            onClick={() => window.open(`/preview/${projectId}`, '_blank', 'noopener,noreferrer')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 font-semibold"
          >
            <span>👁️ Open Preview</span>
            <span>→</span>
          </button>
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500 mb-3">Want to make changes?</p>
            <button
              onClick={onRegenerate}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Generate New Version →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed">
          <div className="text-6xl mb-4">🚀</div>
          <h4 className="text-lg font-semibold mb-2">No Preview Yet</h4>
          <p className="text-gray-600">Generate code to see a live preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Live Preview</h3>
        {projectId && (
          <button
            onClick={() => window.open(`/preview/${projectId}`, '_blank', 'noopener,noreferrer')}
            className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            🔗 Open Full Preview
          </button>
        )}
      </div>
      <div className="bg-gray-100 rounded-lg overflow-hidden border" style={{ height: '500px' }}>
        <iframe
          srcDoc={sanitizeForPreview(code)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          title="Live Preview"
        />
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success('Code copied!', {
              duration: 2000,
              id: 'code-copied-2',
            });
          }}
          className="flex-1 min-w-[120px] px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          📋 Copy Code
        </button>
        <button
          onClick={onDownload}
          className="flex-1 min-w-[120px] px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          💾 Download
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 min-w-[120px] px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? '⏳ Saving...' : '✅ Save Project'}
        </button>
      </div>
    </div>
  );
}
