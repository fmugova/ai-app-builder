'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';

export default function DataUploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed data:', results.data);
        setParsedData(results.data as any[]);
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const uploadData = async () => {
    if (parsedData.length === 0) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);

      const res = await fetch('/api/assessments/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessments: parsedData }),
      });

      if (res.ok) {
        const results = await res.json();
        setUploadResults(results);
        setParsedData([]);
        setFileName('');
      } else {
        const error = await res.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      alert('Error uploading data');
    } finally {
      setUploading(false);
    }
  };

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Upload Assessment Data
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Import GCSE/A-Level assessment results from CSV or Excel files
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded">
          <div className="flex">
            <AlertCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                CSV Format Guidelines
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Your CSV file should include the following columns (column names are case-sensitive):
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>studentName</strong> (required) - Student's full name</li>
                <li><strong>subject</strong> (required) - Subject name (e.g., "Mathematics", "English")</li>
                <li><strong>yearGroup</strong> (required) - Year group number (e.g., 10, 11, 12, 13)</li>
                <li><strong>assessmentType</strong> (optional) - Type of assessment (e.g., "Mock 1", "Mock 2", "Topic Test")</li>
                <li><strong>date</strong> (optional) - Assessment date (YYYY-MM-DD format)</li>
                <li><strong>score</strong> (optional) - Raw score</li>
                <li><strong>grade</strong> (optional) - GCSE grade (1-9) or A-Level grade (A*, A, B, etc.)</li>
                <li><strong>targetGrade</strong> (optional) - Target grade</li>
                <li><strong>predictedGrade</strong> (optional) - Predicted grade</li>
                <li><strong>senStatus</strong> (optional) - true/false for SEN students</li>
                <li><strong>ealStatus</strong> (optional) - true/false for EAL students</li>
                <li><strong>pupilPremium</strong> (optional) - true/false for Pupil Premium students</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Your Data File
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              CSV or Excel files supported (max 5MB)
            </p>

            <div className="flex items-center justify-center">
              <label className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Select File</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {fileName && (
              <p className="mt-4 text-sm text-gray-600">
                Selected: <span className="font-semibold">{fileName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Preview Data */}
        {parsedData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Data Preview ({parsedData.length} rows)
              </h3>
              <button
                onClick={uploadData}
                disabled={uploading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Data'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Year
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedData.slice(0, 10).map((row: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {row.subject}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        Year {row.yearGroup}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {row.grade || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {row.targetGrade || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {row.score || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 10 of {parsedData.length} rows
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults && (
          <div
            className={`rounded-lg shadow p-6 ${
              uploadResults.results.failed === 0
                ? 'bg-green-50 border-l-4 border-green-500'
                : 'bg-yellow-50 border-l-4 border-yellow-500'
            }`}
          >
            <div className="flex items-start">
              {uploadResults.results.failed === 0 ? (
                <Check className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Upload Complete</h3>
                <p className="text-sm mb-4">{uploadResults.message}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded p-4">
                    <p className="text-2xl font-bold text-green-600">
                      {uploadResults.results.success}
                    </p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div className="bg-white rounded p-4">
                    <p className="text-2xl font-bold text-red-600">
                      {uploadResults.results.failed}
                    </p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>

                {uploadResults.results.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Errors:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadResults.results.errors.map((error: any, index: number) => (
                        <div key={index} className="bg-white rounded p-3 text-sm">
                          <p className="font-medium">
                            Row {error.row}: {error.studentName}
                          </p>
                          <p className="text-red-600 text-xs">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => router.push('/teacher/analytics')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Example CSV Template */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Example CSV Template
          </h3>
          <div className="bg-gray-50 rounded p-4 overflow-x-auto">
            <pre className="text-xs text-gray-700">
{`studentName,subject,yearGroup,assessmentType,date,score,grade,targetGrade,senStatus,ealStatus,pupilPremium
John Smith,Mathematics,11,Mock 1,2024-01-15,85,7,8,false,false,true
Jane Doe,English,11,Mock 1,2024-01-15,92,8,8,false,false,false
David Wilson,Mathematics,11,Mock 1,2024-01-15,65,5,6,true,false,true`}
            </pre>
          </div>
          <button
            onClick={() => {
              const template = `studentName,subject,yearGroup,assessmentType,date,score,grade,targetGrade,senStatus,ealStatus,pupilPremium
John Smith,Mathematics,11,Mock 1,2024-01-15,85,7,8,false,false,true
Jane Doe,English,11,Mock 1,2024-01-15,92,8,8,false,false,false`;
              const blob = new Blob([template], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'assessment_template.csv';
              a.click();
            }}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            Download Template
          </button>
        </div>
      </main>
    </div>
  );
}
