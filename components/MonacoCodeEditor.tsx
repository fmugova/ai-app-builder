'use client'

import dynamic from 'next/dynamic'

// Monaco must be client-only (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
    </div>
  ),
})

interface MonacoCodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: string
  readOnly?: boolean
  height?: string
}

export default function MonacoCodeEditor({
  value,
  onChange,
  language = 'html',
  readOnly = false,
  height = '100%',
}: MonacoCodeEditorProps) {
  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: !readOnly,
        folding: true,
        glyphMargin: false,
        lineDecorationsWidth: 4,
        lineNumbersMinChars: 3,
      }}
      onChange={(val) => onChange?.(val ?? '')}
    />
  )
}
