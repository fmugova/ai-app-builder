"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Code,
  Clock,
  Zap,
  Activity,
  Calendar,
} from "lucide-react";

interface AnalyticsData {
  totalProjects: number;
  totalGenerations: number;
  avgGenerationsPerDay: number;
  mostUsedProjectType: string;
  dailyActivity: Array<{ date: string; count: number }>;
  projectsByType: Array<{ type: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    details: string;
  }>;
}

interface AnalyticsDashboardProps {
  userId?: string;
}

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // Mock data for demonstration
        setAnalytics({
          totalProjects: 12,
          totalGenerations: 45,
          avgGenerationsPerDay: 2.3,
          mostUsedProjectType: "Web App",
          dailyActivity: generateMockDailyActivity(),
          projectsByType: [
            { type: "Web App", count: 5 },
            { type: "Landing Page", count: 4 },
            { type: "Dashboard", count: 2 },
            { type: "Portfolio", count: 1 },
          ],
          recentActivity: [
            {
              id: "1",
              action: "Created Project",
              timestamp: new Date().toISOString(),
              details: "SaaS Landing Page",
            },
            {
              id: "2",
              action: "Updated Project",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              details: "Analytics Dashboard",
            },
            {
              id: "3",
              action: "Generated Code",
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              details: "E-commerce Product Page",
            },
          ],
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockDailyActivity = () => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * 5),
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const maxActivity = Math.max(...analytics.dailyActivity.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          Analytics Overview
        </h2>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Code className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.totalProjects}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Projects</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.totalGenerations}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Total Generations</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">
              {analytics.avgGenerationsPerDay.toFixed(1)}
            </span>
          </div>
          <p className="text-green-100 text-sm font-medium">Avg. per Day</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 opacity-80" />
            <span className="text-lg font-bold">{analytics.mostUsedProjectType}</span>
          </div>
          <p className="text-orange-100 text-sm font-medium">Most Used Type</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Daily Activity
          </h3>
          <div className="space-y-2">
            {analytics.dailyActivity.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{
                      width: `${maxActivity > 0 ? (day.count / maxActivity) * 100 : 0}%`,
                      minWidth: day.count > 0 ? "30px" : "0",
                    }}
                  >
                    {day.count > 0 && (
                      <span className="text-xs font-semibold text-white">
                        {day.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Projects by Type
          </h3>
          <div className="space-y-4">
            {analytics.projectsByType.map((item, index) => {
              const colors = [
                "from-blue-500 to-blue-600",
                "from-purple-500 to-purple-600",
                "from-green-500 to-green-600",
                "from-orange-500 to-orange-600",
              ];
              const maxCount = Math.max(
                ...analytics.projectsByType.map((p) => p.count)
              );
              const percentage = (item.count / maxCount) * 100;

              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.type}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${colors[index % colors.length]} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {analytics.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {activity.action}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activity.details}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}