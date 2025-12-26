'use client';

import { useState } from 'react';
import { MessageSquare, Star, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter some feedback');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'general',
          subject: `User Feedback - ${rating} stars`,
          message: feedback,
          priority: rating <= 2 ? 'high' : 'medium'
        })
      });

      if (res.ok) {
        toast.success('Thank you for your feedback! 🙏');
        
        // CRITICAL FIX: Reset state and close modal
        setFeedback('');
        setRating(0);
        setIsOpen(false);
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition flex items-center gap-2 z-40"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium">Feedback</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Share Your Feedback
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            How would you rate BuildFlow AI?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell us what you think! Feature requests, bugs, or just say hi..."
          className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white resize-none"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={submitFeedback}
            disabled={submitting || !feedback.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
