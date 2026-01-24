'use client';

interface ValidationBadgeProps {
    validation: {
        score: number;
        passed: boolean;
        errors: string[];
        warnings: string[];
    };
}

export default function ValidationBadge({ validation }: ValidationBadgeProps) {
    const getColor = (score: number) => {
        if (score >= 90) return 'bg-green-500';
        if (score >= 80) return 'bg-blue-500';
        if (score >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className={`w-12 h-12 rounded-full ${getColor(validation.score)} 
                           flex items-center justify-center text-white font-bold text-xl`}>
                {getGrade(validation.score)}
            </div>
            <div className="flex-1">
                <div className="font-semibold">Code Quality: {validation.score}/100</div>
                <div className="text-sm text-gray-600">
                    {validation.errors.length} errors, {validation.warnings.length} warnings
                </div>
            </div>
            {validation.passed ? (
                <span className="text-green-600 font-semibold">✓ Passed</span>
            ) : (
                <span className="text-red-600 font-semibold">✗ Failed</span>
            )}
        </div>
    );
}