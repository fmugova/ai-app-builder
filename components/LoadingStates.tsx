"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, Rocket } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  showProgress?: boolean;
}

const loadingMessages = [
  "Crafting your masterpiece...",
  "Generating code magic...",
  "Assembling components...",
  "Building something amazing...",
  "Weaving code together...",
  "Almost there...",
  "Putting the finishing touches...",
];

export default function LoadingState({ 
  message, 
  showProgress = false 
}: LoadingStateProps) {
  const [currentMessage, setCurrentMessage] = useState(
    message || loadingMessages[0]
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!message) {
      const messageInterval = setInterval(() => {
        setCurrentMessage(
          loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
        );
      }, 2000);

      return () => clearInterval(messageInterval);
    }
  }, [message]);

  useEffect(() => {
    if (showProgress) {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      return () => clearInterval(progressInterval);
    }
  }, [showProgress]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Animated Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse blur-xl opacity-50" />
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-full">
          <Sparkles className="w-12 h-12 text-white animate-spin-slow" />
        </div>
      </div>

      {/* Loading Message */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center animate-pulse">
        {currentMessage}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        This usually takes just a few seconds
      </p>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Animated Dots */}
      <div className="flex space-x-2 mt-8">
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// Success Animation Component
export function SuccessAnimation({ 
  message = "Success!", 
  onClose 
}: { 
  message?: string; 
  onClose?: () => void;
}) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Success Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-ping opacity-75" />
        <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-full">
          <Rocket className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Success Message */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        {message}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center">
        Your project is ready to ship! 🚀
      </p>

      {/* Confetti Effect (simple version) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Error State Component
export function ErrorState({ 
  message = "Something went wrong", 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Error Icon */}
      <div className="relative mb-6">
        <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full">
          <Zap className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Error Message */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Oops! {message}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        Don't worry, let's try that again
      </p>

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
        >
          Try Again
        </button>
      )}
    </div>
  );
}