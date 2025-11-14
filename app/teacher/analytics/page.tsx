'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  AlertCircle,
  Download,
  Sparkles,
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedYearGroup, setSelectedYearGroup] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadAnalytics();
    }
  }, [status, router, selectedSubject, selectedYearGroup]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedYearGroup) params.append('yearGroup', selectedYearGroup);

      const res = await fetch(`/api/teacher/analytics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!selectedSubject || !selectedYearGroup) {
      alert('Please select a subject and year group first');
      return;
    }

    try {
      setAnalyzingWithAI(true);
      const res = await fetch('/api/teacher/ai/analyze-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          yearGroup: selectedYearGroup,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis);
      } else {
        alert('Failed to generate AI analysis');
      }
    } catch (error) {
      console.error('Error running AI analysis:', error);
      alert('Error running AI analysis');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-center text-gray-600">No analytics data available</p>
      </div>
    );
  }

  // Prepare chart data
  const progressData = [
    { name: 'On Target', value: analytics.overallProgress.onTarget },
    { name: 'Borderline', value: analytics.overallProgress.borderline },
    { name: 'Below Target', value: analytics.overallProgress.belowTarget },
  ];

  const gradeDistData = Object.keys(analytics.gradeDistribution).map(grade => ({
    grade,
    count: analytics.gradeDistribution[grade],
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Data Analysis & KPIs</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">All Subjects</option>
                {analytics.subjects.map((s: any) => (
                  <option key={s.subject} value={s.subject}>
                    {s.subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Group
              </label>
              <select
                value={selectedYearGroup}
                onChange={(e) => setSelectedYearGroup(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">All Years</option>
                <option value="10">Year 10</option>
                <option value="11">Year 11</option>
                <option value="12">Year 12</option>
                <option value="13">Year 13</option>
              </select>
            </div>
            <button
              onClick={runAIAnalysis}
              disabled={analyzingWithAI || !selectedSubject || !selectedYearGroup}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{analyzingWithAI ? 'Analyzing...' : 'AI Analysis'}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Students"
            value={analytics.totalStudents.toString()}
            icon={<Users className="w-6 h-6" />}
            color="bg-blue-500"
          />
          <KPICard
            title="On Target"
            value={analytics.overallProgress.onTarget.toString()}
            subtitle={`${((analytics.overallProgress.onTarget / analytics.totalStudents) * 100).toFixed(1)}%`}
            icon={<Target className="w-6 h-6" />}
            color="bg-green-500"
          />
          <KPICard
            title="Borderline"
            value={analytics.overallProgress.borderline.toString()}
            subtitle={`${((analytics.overallProgress.borderline / analytics.totalStudents) * 100).toFixed(1)}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="bg-yellow-500"
          />
          <KPICard
            title="Below Target"
            value={analytics.overallProgress.belowTarget.toString()}
            subtitle={`${((analytics.overallProgress.belowTarget / analytics.totalStudents) * 100).toFixed(1)}%`}
            icon={<AlertCircle className="w-6 h-6" />}
            color="bg-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Progress Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Progress Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Grade Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Subject Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    On Target %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Below Target %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.subjects.map((subject: any) => (
                  <tr key={subject.subject}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {subject.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {subject.studentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {subject.averageGrade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-semibold">
                        {subject.onTargetPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-red-600 font-semibold">
                        {subject.belowTargetPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                AI-Generated Insights
              </h3>
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">{aiAnalysis}</div>
            </div>
          </div>
        )}

        {/* At-Risk Students */}
        {analytics.atRiskStudents.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              At-Risk Students (Top 20)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.atRiskStudents.map((student: any) => (
                    <tr key={`${student.studentId}-${student.subject}`}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {student.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {student.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        Grade {student.currentGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        Grade {student.targetGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-red-600 font-semibold">
                          -{student.gap}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {student.senStatus && (
                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1">
                            SEN
                          </span>
                        )}
                        {student.pupilPremium && (
                          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded mr-1">
                            PP
                          </span>
                        )}
                        {student.ealStatus && (
                          <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                            EAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${color} text-white`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
