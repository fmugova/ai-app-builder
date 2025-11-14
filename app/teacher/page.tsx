'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  BookOpen,
  Users,
  BarChart3,
  Mail,
  CheckSquare,
  Target,
  PlusCircle,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todaysTimetable, setTodaysTimetable] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadDashboardData();
    }
  }, [status, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get today's day name
      const today = format(new Date(), 'EEEE');

      // Fetch today's timetable
      const timetableRes = await fetch(`/api/teacher/timetable?day=${today}`);
      if (timetableRes.ok) {
        const timetable = await timetableRes.json();
        setTodaysTimetable(timetable);
      }

      // Fetch upcoming tasks
      const tasksRes = await fetch('/api/teacher/tasks?completed=false');
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        setUpcomingTasks(tasks.slice(0, 5));
      }

      // Fetch recent students
      const studentsRes = await fetch('/api/students');
      if (studentsRes.ok) {
        const students = await studentsRes.json();
        setRecentStudents(students.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Teacher's Digital Planner
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {session?.user?.name || 'Teacher'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickAction
            icon={<BookOpen className="w-6 h-6" />}
            title="New Lesson Plan"
            description="Create with AI"
            href="/teacher/lesson-plans/new"
            color="bg-blue-500"
          />
          <QuickAction
            icon={<Users className="w-6 h-6" />}
            title="Manage Students"
            description="View & edit"
            href="/teacher/students"
            color="bg-green-500"
          />
          <QuickAction
            icon={<BarChart3 className="w-6 h-6" />}
            title="Data Analysis"
            description="View insights"
            href="/teacher/analytics"
            color="bg-purple-500"
          />
          <QuickAction
            icon={<Mail className="w-6 h-6" />}
            title="Draft Email"
            description="AI assistant"
            href="/teacher/communications"
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Timetable */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Today's Timetable
                </h2>
                <Link
                  href="/teacher/timetable"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Full →
                </Link>
              </div>

              {todaysTimetable.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No classes scheduled for today
                </p>
              ) : (
                <div className="space-y-3">
                  {todaysTimetable.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {entry.subject} - {entry.classCode}
                          </p>
                          <p className="text-sm text-gray-600">
                            {entry.yearGroup} | Room {entry.room}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            Period {entry.period}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.startTime} - {entry.endTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CheckSquare className="w-5 h-5 mr-2" />
                  Upcoming Tasks
                </h2>
                <Link
                  href="/teacher/tasks"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All →
                </Link>
              </div>

              {upcomingTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No pending tasks
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            task.priority === 'Urgent'
                              ? 'bg-red-500'
                              : task.priority === 'Important'
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {task.category}
                          </p>
                        </div>
                      </div>
                      {task.dueDate && (
                        <p className="text-sm text-gray-600">
                          {format(new Date(task.dueDate), 'MMM d')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Quick Stats
              </h2>
              <div className="space-y-4">
                <StatItem
                  label="Total Students"
                  value={recentStudents.length.toString()}
                  icon={<Users className="w-4 h-4" />}
                />
                <StatItem
                  label="Classes Today"
                  value={todaysTimetable.length.toString()}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <StatItem
                  label="Pending Tasks"
                  value={upcomingTasks.length.toString()}
                  icon={<AlertCircle className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Links
              </h2>
              <nav className="space-y-2">
                <NavLink
                  href="/teacher/timetable"
                  icon={<Calendar className="w-4 h-4" />}
                  label="Timetable & Calendar"
                />
                <NavLink
                  href="/teacher/lesson-plans"
                  icon={<BookOpen className="w-4 h-4" />}
                  label="Lesson Planning"
                />
                <NavLink
                  href="/teacher/students"
                  icon={<Users className="w-4 h-4" />}
                  label="Students & Classes"
                />
                <NavLink
                  href="/teacher/analytics"
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Data Analysis"
                />
                <NavLink
                  href="/teacher/interventions"
                  icon={<Target className="w-4 h-4" />}
                  label="Interventions"
                />
                <NavLink
                  href="/teacher/communications"
                  icon={<Mail className="w-4 h-4" />}
                  label="Communications"
                />
                <NavLink
                  href="/teacher/tasks"
                  icon={<CheckSquare className="w-4 h-4" />}
                  label="Tasks & Meetings"
                />
              </nav>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Quick Action Card Component
function QuickAction({
  icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
    >
      <div className={`inline-flex p-3 rounded-lg ${color} text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}

// Stat Item Component
function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

// Nav Link Component
function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="text-gray-500">{icon}</div>
      <span className="text-sm text-gray-700">{label}</span>
    </Link>
  );
}
