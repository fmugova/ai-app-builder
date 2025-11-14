'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, BookOpen, Save, Download } from 'lucide-react';

export default function NewLessonPlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    topic: '',
    subject: '',
    yearGroup: '',
    duration: '60',
    priorKnowledge: '',
    examBoard: '',
    differentiation: '',
    classCode: '',
  });

  const [generatedPlan, setGeneratedPlan] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const generatePlan = async () => {
    if (!formData.topic || !formData.subject || !formData.yearGroup) {
      alert('Please fill in Topic, Subject, and Year Group');
      return;
    }

    try {
      setGenerating(true);

      const res = await fetch('/api/teacher/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPlan(data.lessonPlan);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating lesson plan:', error);
      alert('Error generating lesson plan');
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async () => {
    if (!generatedPlan) {
      alert('Please generate a lesson plan first');
      return;
    }

    try {
      setSaving(true);

      // Parse the generated plan to extract objectives, activities, resources
      const objectives = extractSection(generatedPlan, 'Learning Objectives');
      const activities = extractSection(generatedPlan, 'Main Activities');
      const resources = extractSection(generatedPlan, 'Resources');
      const differentiation = extractSection(generatedPlan, 'Differentiation');
      const assessment = extractSection(generatedPlan, 'Assessment');
      const homework = extractSection(generatedPlan, 'Homework');
      const specPoints = extractSection(generatedPlan, 'Specification Points');

      const res = await fetch('/api/teacher/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          topic: formData.topic,
          yearGroup: formData.yearGroup,
          classCode: formData.classCode,
          duration: parseInt(formData.duration),
          objectives: JSON.stringify(objectives),
          activities: JSON.stringify(activities),
          resources: JSON.stringify(resources),
          differentiation,
          assessment,
          homework,
          specPoints,
        }),
      });

      if (res.ok) {
        alert('Lesson plan saved successfully!');
        router.push('/teacher/lesson-plans');
      } else {
        alert('Failed to save lesson plan');
      }
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert('Error saving lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const downloadPlan = () => {
    if (!generatedPlan) return;

    const blob = new Blob([generatedPlan], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson-plan-${formData.subject}-${formData.topic}.txt`;
    a.click();
  };

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-8 h-8 mr-3" />
            Create Lesson Plan
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Use AI to generate comprehensive, curriculum-aligned lesson plans
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Lesson Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  placeholder="e.g., Pythagoras' Theorem"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Science">Science</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Languages">Languages</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Group *
                  </label>
                  <select
                    name="yearGroup"
                    value={formData.yearGroup}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select year</option>
                    <option value="Year 7">Year 7</option>
                    <option value="Year 8">Year 8</option>
                    <option value="Year 9">Year 9</option>
                    <option value="Year 10">Year 10</option>
                    <option value="Year 11">Year 11</option>
                    <option value="Year 12">Year 12</option>
                    <option value="Year 13">Year 13</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code (Optional)
                </label>
                <input
                  type="text"
                  name="classCode"
                  value={formData.classCode}
                  onChange={handleChange}
                  placeholder="e.g., 11MA1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prior Knowledge
                </label>
                <textarea
                  name="priorKnowledge"
                  value={formData.priorKnowledge}
                  onChange={handleChange}
                  placeholder="e.g., Students know basic triangle properties and can calculate areas"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Board
                </label>
                <select
                  name="examBoard"
                  value={formData.examBoard}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select exam board</option>
                  <option value="AQA">AQA</option>
                  <option value="Edexcel">Edexcel</option>
                  <option value="OCR">OCR</option>
                  <option value="WJEC">WJEC</option>
                  <option value="CCEA">CCEA</option>
                  <option value="Cambridge">Cambridge</option>
                  <option value="IB">IB</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Differentiation Needs
                </label>
                <textarea
                  name="differentiation"
                  value={formData.differentiation}
                  onChange={handleChange}
                  placeholder="e.g., Support for lower ability, extension for higher ability, EAL strategies"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={generatePlan}
                disabled={generating}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>{generating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            </div>
          </div>

          {/* Generated Plan */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Generated Lesson Plan
              </h2>
              {generatedPlan && (
                <div className="flex space-x-2">
                  <button
                    onClick={downloadPlan}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={savePlan}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            {generatedPlan ? (
              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded p-6 overflow-y-auto max-h-[700px]">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                    {generatedPlan}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  Fill in the lesson details and click "Generate with AI" to create your
                  lesson plan
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to extract sections from generated plan
function extractSection(plan: string, sectionName: string): string[] | string {
  const regex = new RegExp(
    `(?:${sectionName}|${sectionName.replace(/\s/g, '')}):?\\s*([\\s\\S]*?)(?=\\n\\n|\\n#|$)`,
    'i'
  );
  const match = plan.match(regex);

  if (!match) return [];

  const content = match[1].trim();

  // Try to extract bullet points
  const bullets = content
    .split('\n')
    .filter((line) => line.trim().match(/^[-*•]/))
    .map((line) => line.trim().replace(/^[-*•]\s*/, ''));

  return bullets.length > 0 ? bullets : [content];
}
