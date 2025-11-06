// In your dashboard page (e.g., app/dashboard/page.tsx)
import EnhancedDashboard from '@/components/EnhancedDashboard';
import OnboardingTutorial from '@/components/OnboardingTutorial';

export default function DashboardPage() {
  return (
    <>
      <EnhancedDashboard 
        user={{ name: "User", email: "user@example.com" }}
        currentPlan="Free"
        generationsUsed={1}
        generationsLimit={3}
      />
      <OnboardingTutorial />
    </>
  );
}