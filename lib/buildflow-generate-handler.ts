// BuildFlow AI Integration Handler Example
import Anthropic from '@anthropic-ai/sdk';
import { parseGeneratedCode } from './code-parser';
import CodeValidator from './validator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const generateWebApp = async (systemPrompt: string, prompt: string) => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: `${systemPrompt}\n\nUser request: ${prompt}`
    }],
    max_tokens: 30000
  });


  // Extract text content from response blocks
  const textContent = Array.isArray(response.content)
    ? response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
    : response.content;

  // Parse and validate
  const { html, css, javascript: js } = parseGeneratedCode(textContent);

  // Run validation
  const validator = new CodeValidator();
  const validationResults = validator.validateAll(html || '', css || '', js || '');

  if (!validationResults.passed) {
    // Retry with validation feedback (implement as needed)
    return { error: 'Validation failed', details: validationResults.errors };
  }

  return { html, css, js };
};
