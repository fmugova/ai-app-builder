'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const QUICK_TEMPLATES = [
  {
    label: '☕ Coffee Shop Site',
    prompt: 'Create a landing page for a coffee shop with home, menu, and contact pages',
    type: 'simple-website',
  },
  {
    label: '✅ Task Manager',
    prompt: 'Build a task management app with user authentication, create/edit/delete tasks, and filtering',
    type: 'full-stack-app',
  },
  {
    label: '💼 Portfolio',
    prompt: 'Create a developer portfolio with home, projects, about, and contact pages',
    type: 'simple-website',
  },
  {
    label: '📝 Blog CMS',
    prompt: 'Build a blog with post creation, rich text editor, categories, and public blog pages',
    type: 'full-stack-app',
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string, type: string) => void;
}

export default function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Start Templates</h3>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_TEMPLATES.map((template) => (
          <Button
            key={template.label}
            variant="outline"
            size="sm"
            onClick={() => onSelect(template.prompt, template.type)}
            className="justify-start text-left h-auto py-2"
          >
            {template.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
