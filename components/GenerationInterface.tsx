/**
 * Generation Interface Component
 * React component for BuildFlow AI with iteration support
 * 
 * Features:
 * - Detects existing projects and shows iteration mode toggle
 * - Displays conversation history
 * - Shows existing files
 * - Streams AI responses in real-time
 * - Handles iteration vs fresh generation
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedFile {
  filename: string;
  content: string;
  path: string;
}

interface GenerationInterfaceProps {
  projectId?: string | null;
  existingFiles?: GeneratedFile[];
  initialPrompt?: string;
}

export default function GenerationInterface({ 
  projectId = null,
  existingFiles = [],
  initialPrompt = ''
}: GenerationInterfaceProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>(existingFiles);
  const [streamingText, setStreamingText] = useState('');
  const [generationMode, setGenerationMode] = useState<'iterate' | 'fresh'>('iterate');
  const [showModeToggle, setShowModeToggle] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect if we have an existing project
  useEffect(() => {
    setShowModeToggle(projectId !== null && existingFiles.length > 0);
    if (existingFiles.length > 0) {
      setGeneratedFiles(existingFiles);
    }
  }, [projectId, existingFiles]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStreamingText('');

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          projectId: generationMode === 'iterate' ? projectId : null,
          previousPrompts: conversationHistory
            .filter(m => m.role === 'user')
            .map(m => m.content),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content' || data.type === 'text') {
                fullResponse += data.text || data.content || '';
                setStreamingText(fullResponse);
              } else if (data.type === 'complete') {
                // Generation complete
                console.log('Generation complete:', data);
                
                // Add assistant response to history
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: fullResponse,
                  timestamp: new Date()
                };
                setConversationHistory(prev => [...prev, assistantMessage]);

                // If new project, redirect to project page
                if (data.projectId && !projectId) {
                  router.push(`/dashboard/projects/${data.projectId}`);
                } else if (projectId) {
                  // Refresh the page to show updated files
                  router.refresh();
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setPrompt('');
      setStreamingText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Mode Toggle */}
      {showModeToggle && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Generation Mode</h3>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setGenerationMode('iterate')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                generationMode === 'iterate'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                <span>Iterate (Add Features)</span>
              </div>
              <p className="text-xs mt-1 opacity-80">
                Modify existing project
              </p>
            </button>
            
            <button
              onClick={() => setGenerationMode('fresh')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                generationMode === 'fresh'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Start Fresh</span>
              </div>
              <p className="text-xs mt-1 opacity-80">
                Create new project
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Existing Files Preview */}
      {generationMode === 'iterate' && generatedFiles.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Current Files ({generatedFiles.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {generatedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {file.filename}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 flex items-center gap-1">
            <ChevronRight className="w-4 h-4" />
            Your next prompt will add to or modify these files
          </p>
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {conversationHistory.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                  : 'bg-gray-50 dark:bg-gray-800 mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm">
                  {message.role === 'user' ? '👤 You' : '🤖 BuildFlow AI'}
                </span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaming Response */}
      {streamingText && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 mr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">🤖 BuildFlow AI</span>
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
            {streamingText}
            <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            generationMode === 'iterate' && generatedFiles.length > 0
              ? "Add features, modify styling, enhance functionality... (Cmd/Ctrl + Enter to generate)"
              : "Describe the website or app you want to create... (Cmd/Ctrl + Enter to generate)"
          }
          disabled={isGenerating}
          className="w-full min-h-[120px] max-h-[300px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          rows={3}
        />
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Cmd</kbd> + <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to generate
          </p>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {generationMode === 'iterate' ? 'Add to Project' : 'Generate'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helper Tips */}
      {generationMode === 'iterate' && generatedFiles.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">💡 Iteration Tips</h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• &quot;Add a dark mode toggle&quot;</li>
            <li>• &quot;Make the navbar sticky&quot;</li>
            <li>• &quot;Add a contact form&quot;</li>
            <li>• &quot;Change the button colors to blue&quot;</li>
          </ul>
        </div>
      )}
    </div>
  );
}
