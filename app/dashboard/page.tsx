"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedDashboard from '@/components/EnhancedDashboard';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import { QuickTips } from '@/components/OnboardingTutorial';

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user data and usage stats
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Use default values if API fails
        setUserData({
          user: { name: "User", email: "user@example.com" },
          plan: "Free",
          used: 0,
          limit: 3
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <EnhancedDashboard 
        user={userData?.user || { name: "User", email: "user@example.com" }}
        currentPlan={userData?.plan || "Free"}
        generationsUsed={userData?.used || 0}
        generationsLimit={userData?.limit || 3}
      />
      <OnboardingTutorial />
      <QuickTips />
    </>
  );
}