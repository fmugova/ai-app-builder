"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Zap, Rocket, Check, User, List, Database, Palette } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  richContent?: React.ReactNode;
}

export default function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("buildflow_onboarding_completed");
    if (!completed) {
      setTimeout(() => setIsOpen(true), 1000);
    } else {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const pillars = [
    {
      letter: "P",
      label: "Persona & Purpose",
      color: "from-purple-500 to-purple-700",
      bg: "bg-purple-50 border-purple-200",
      text: "text-purple-700",
      icon: <User className="w-4 h-4" />,
      hint: "Who is it for? What's the big win?",
      example: "\"A boutique plant shop owner who wants to sell rare succulents online\"",
    },
    {
      letter: "F",
      label: "Features & Logic",
      color: "from-blue-500 to-blue-700",
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      icon: <List className="w-4 h-4" />,
      hint: "List 3–4 must-have features + how they work",
      example: "\"User login, product search, photo upload, Stripe checkout\"",
    },
    {
      letter: "D",
      label: "Data & Tech Stack",
      color: "from-green-500 to-green-700",
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      icon: <Database className="w-4 h-4" />,
      hint: "What gets saved? Preferred stack?",
      example: "\"Next.js + Supabase. Store: user profiles, product prices, orders\"",
    },
    {
      letter: "A",
      label: "Aesthetics & Feel",
      color: "from-pink-500 to-pink-700",
      bg: "bg-pink-50 border-pink-200",
      text: "text-pink-700",
      icon: <Palette className="w-4 h-4" />,
      hint: "Style, mood, and UI layout",
      example: "\"Warm, earthy tones. Sidebar nav, card-based product grid\"",
    },
  ];

  const steps: OnboardingStep[] = [
    {
      title: "Welcome to BuildFlow! 🚀",
      description: "Build and deploy AI-powered apps in minutes. Let's get you started with a quick tour.",
      icon: <Sparkles className="w-12 h-12 text-white" />,
    },
    {
      title: "The Ultra-Prompt Formula",
      description: "Better prompts = better apps. Use the P.F.D.A. framework to describe what you want — and get production-ready code first time.",
      icon: <Sparkles className="w-12 h-12 text-white" />,
      richContent: (
        <div className="space-y-3">
          {pillars.map((p) => (
            <div key={p.letter} className={`flex gap-3 p-3 rounded-xl border ${p.bg}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold text-sm`}>
                {p.letter}
              </div>
              <div className="min-w-0">
                <div className={`flex items-center gap-1.5 font-semibold text-sm ${p.text} mb-0.5`}>
                  {p.icon}
                  {p.label}
                </div>
                <p className="text-xs text-gray-500 mb-1">{p.hint}</p>
                <p className="text-xs text-gray-600 italic">{p.example}</p>
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">Example in action: "I want a pet sitting app"</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-medium">P:</span> Busy pet owners finding local sitters ·{" "}
              <span className="font-medium">F:</span> Map search, booking calendar, photo feed ·{" "}
              <span className="font-medium">D:</span> React + Firebase, store: bookings, profiles ·{" "}
              <span className="font-medium">A:</span> Friendly pastels, rounded buttons, card layout
            </p>
          </div>
        </div>
      ),
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
  const isPFDAStep = currentStep === 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full overflow-hidden ${isPFDAStep ? 'max-w-2xl' : 'max-w-lg'}`}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-3">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
              {currentStepData.icon}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-1">
            {currentStepData.title}
          </h2>
          <p className="text-white/80 text-center text-sm">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className={`p-6 ${isPFDAStep ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
          <p className="text-base text-gray-700 dark:text-gray-300 text-center mb-4">
            {currentStepData.description}
          </p>

          {currentStepData.richContent && (
            <div className="mb-4">
              {currentStepData.richContent}
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex items-center justify-center space-x-2 my-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-purple-600 w-8"
                    : index < currentStep
                    ? "bg-green-500 w-2"
                    : "bg-gray-300 dark:bg-gray-600 w-2"
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
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors text-sm"
            >
              Skip
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
    "💡 Tip: Use the P.F.D.A. formula — Persona, Features, Data, Aesthetics — for better prompts",
    "⚡ Tip: Start with a template to save time and get better results",
    "🚀 Tip: Upgrade to Pro for unlimited projects and generations",
    "✨ Tip: Export as ZIP for a complete Next.js project structure",
    "📱 Tip: All generated code is mobile-responsive by default",
    "🎨 Tip: Click the sparkle button (bottom-right) to replay the tutorial any time",
  ];

  useEffect(() => {
    const showTips = localStorage.getItem("buildflow_show_tips") !== "false";
    if (!showTips) return;

    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }, 30000);

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
