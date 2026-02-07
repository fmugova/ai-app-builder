'use client';

import { useState } from 'react';
import { ValidationResult, ValidationMessage } from '@/lib/validators/code-validator';
import { AutoFixResult } from '@/lib/validators/auto-fixer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Wand2,
  ChevronDown,
  ChevronRight 
} from 'lucide-react';

interface CodeQualityReportProps {
  validationResult: ValidationResult;
  onAutoFix?: () => void;
  isFixing?: boolean;
  autoFixResult?: AutoFixResult;
}

export default function CodeQualityReport({
  validationResult,
  onAutoFix,
  isFixing = false,
  autoFixResult,
}: CodeQualityReportProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['error'])
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  // Combine all messages into a single array
  const allMessages = [
    ...validationResult.errors,
    ...validationResult.warnings,
    ...validationResult.info
  ];

  const groupedIssues = allMessages.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, ValidationMessage[]>);

  const autoFixableCount = allMessages.filter(
    i => i.fix && (i.type === 'error' || i.type === 'warning')
  ).length;

  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const infoCount = validationResult.info.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Code Quality Report
              {validationResult.passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
            <CardDescription>
              Automated analysis of HTML, SEO, and accessibility
            </CardDescription>
          </div>
          {autoFixableCount > 0 && onAutoFix && (
            <Button
              onClick={onAutoFix}
              disabled={isFixing}
              variant="outline"
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {isFixing ? 'Fixing...' : `Auto-Fix (${autoFixableCount})`}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(validationResult.summary.score)}`}>
              {validationResult.summary.score}/100
            </span>
          </div>
          <Progress value={validationResult.summary.score} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {getScoreLabel(validationResult.summary.score)} - {validationResult.summary.grade}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {errorCount}
              </span>
            </div>
            <p className="text-xs text-red-600">Errors</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">
                {warningCount}
              </span>
            </div>
            <p className="text-xs text-yellow-600">Warnings</p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {infoCount}
              </span>
            </div>
            <p className="text-xs text-blue-600">Info</p>
          </div>
        </div>

        {/* Auto-Fix Result */}
        {autoFixResult && autoFixResult.appliedFixes.length > 0 && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">
              Auto-Fix Applied
            </AlertTitle>
            <AlertDescription className="text-green-600">
              <ul className="list-disc list-inside mt-2 space-y-1">
                {autoFixResult.appliedFixes.map((fix, index) => (
                  <li key={index} className="text-sm">{fix}</li>
                ))}
              </ul>
              {autoFixResult.remainingIssues > 0 && (
                <p className="text-sm mt-2">
                  {autoFixResult.remainingIssues} issue(s) require manual attention.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Issues by Type */}
        {allMessages.length > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({allMessages.length})
              </TabsTrigger>
              <TabsTrigger value="error">
                Errors ({errorCount})
              </TabsTrigger>
              <TabsTrigger value="warning">
                Warnings ({warningCount})
              </TabsTrigger>
              <TabsTrigger value="info">
                Info ({infoCount})
              </TabsTrigger>
              <TabsTrigger value="fixable">
                Auto-fixable ({autoFixableCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2">
              <IssuesList issues={allMessages} />
            </TabsContent>

            <TabsContent value="error" className="space-y-2">
              <IssuesList issues={groupedIssues.error || []} />
            </TabsContent>

            <TabsContent value="warning" className="space-y-2">
              <IssuesList issues={groupedIssues.warning || []} />
            </TabsContent>

            <TabsContent value="info" className="space-y-2">
              <IssuesList issues={groupedIssues.info || []} />
            </TabsContent>

            <TabsContent value="fixable" className="space-y-2">
              <IssuesList
                issues={allMessages.filter(i => i.fix)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">
              Perfect Code Quality!
            </AlertTitle>
            <AlertDescription className="text-green-600">
              No issues found. Your code follows all best practices.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Status */}
        {validationResult.summary.status && (
          <div className="text-sm text-muted-foreground">
            <strong>Status:</strong> {validationResult.summary.status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssuesList({ issues }: { issues: ValidationMessage[] }) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const toggleIssue = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  if (issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No issues in this category
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div
          key={index}
          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
        >
          <div
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => toggleIssue(index)}
          >
            <div className="mt-0.5">
              {issue.type === 'error' && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              {issue.type === 'warning' && (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              {issue.type === 'info' && (
                <Info className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{issue.message}</p>
                {issue.fix && (
                  <Badge variant="secondary" className="text-xs">
                    <Wand2 className="h-3 w-3 mr-1" />
                    Auto-fixable
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {issue.category}
                </Badge>
                {issue.severity && (
                  <Badge 
                    variant={
                      issue.severity === 'critical' ? 'destructive' :
                      issue.severity === 'high' ? 'default' :
                      'secondary'
                    } 
                    className="text-xs"
                  >
                    {issue.severity}
                  </Badge>
                )}
              </div>
              {issue.line && (
                <p className="text-xs text-muted-foreground mb-1">
                  Line {issue.line}{issue.column ? `, Column ${issue.column}` : ''}
                </p>
              )}
              {expandedIssues.has(index) && issue.fix && (
                <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                  <strong>How to fix:</strong> {issue.fix}
                </div>
              )}
            </div>
            {expandedIssues.has(index) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
