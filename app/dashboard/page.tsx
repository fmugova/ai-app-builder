"use client";

import dynamic from "next/dynamic";

const EnhancedDashboard = dynamic(() => import("@/components/EnhancedDashboard"), {
  ssr: false,
});

export default function DashboardPage() {
  return <EnhancedDashboard />;
}