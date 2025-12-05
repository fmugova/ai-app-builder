"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Zap, Rocket, Check } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

export default function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem("buildflow_onboarding_completed");
    if (!completed) {
      // Show onboarding after a brief delay
      setTimeout(() => setIsOpen(true), 1000);
    } else {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      title: "Welcome to BuildFlow! 🚀",
      description: "Build and deploy AI-powered apps in minutes. Let's get you started with a quick tour.",
      icon: <Sparkles className="w-12 h-12 text-white" />,
    },
    {
      title: "Choose Your Project Type",
      description: "Select from landing pages, web apps, dashboards, or portfolios. Each comes with optimized templates.",
      icon: <Zap className="w-12 h-12 text-white" />,
    },
    {
      title: "AI-Powered Refinement",
      description: "Chat with our AI to refine your code. Make changes, add features, or fix issues instantly.",
      icon: <Sparkles className="w-12 h-12 text-white" />,
    },
    {
      title: "Download & Deploy",
      description: "Get production-ready code instantly. Export to GitHub or download as a ZIP file.",
      icon: <Rocket className="w-12 h-12 text-white" />,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("buildflow_onboarding_completed", "true");
    setHasCompletedOnboarding(true);
    setIsOpen(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen || hasCompletedOnboarding) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all z-50"
        title="Show tutorial"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
              {currentStepData.icon}
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-2">
            {currentStepData.title}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-8">
            {currentStepData.description}
          </p>

          {/* Step Indicators */}
          <div className="flex items-center justify-center space-x-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-purple-600 w-8"
                    : index < currentStep
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </button>

            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>

            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Check className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Tips Component - Shows random tips periodically
export function QuickTips() {
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const tips = [
    "💡 Tip: Use the AI chat to refine your code with natural language",
    "⚡ Tip: Start with a template to save time and get better results",
    "🚀 Tip: Upgrade to Pro for unlimited projects and generations",
    "✨ Tip: Export as ZIP for a complete Next.js project structure",
    "📱 Tip: All generated code is mobile-responsive by default",
    "🎨 Tip: Choose from 6 pre-built templates to kickstart your project",
  ];

  useEffect(() => {
    const showTips = localStorage.getItem("buildflow_show_tips") !== "false";
    if (!showTips) return;

    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }, 30000); // Show every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("buildflow_show_tips", "false");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700 animate-slide-up z-50">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-700 dark:text-gray-300 pr-2">
          {tips[currentTip]}
        </p>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}