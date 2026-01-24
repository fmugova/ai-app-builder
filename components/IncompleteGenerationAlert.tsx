import { AlertTriangle, RefreshCw, Zap } from 'lucide-react';
interface IncompleteGenerationAlertProps {
  onContinue: () => void;
  onSimplify: () => void;
  issues: Array<{ message: string; severity: string }>;
}

export function IncompleteGenerationAlert({ onContinue, onSimplify, issues }: IncompleteGenerationAlertProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl mb-6 flex items-start gap-4">
      <div className="pt-1">
        <AlertTriangle className="text-yellow-500 w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-yellow-800 mb-1 flex items-center gap-2">
          Incomplete Generation Detected
        </div>
        <div className="text-yellow-700 text-sm mb-2">
          The generated code appears to be incomplete or truncated.
          {issues?.length > 0 && (
            <ul className="list-disc ml-5 mt-1">
              {issues.map((issue, i) => (
                <li key={i}>{issue.message || String(issue)}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Continue Generation
          </button>
          <button
            onClick={onSimplify}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
          >
            <Zap className="w-4 h-4" /> Simplify & Retry
          </button>
        </div>
      </div>
    </div>
  );
}
