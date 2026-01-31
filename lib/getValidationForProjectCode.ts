import { parseGeneratedCode } from '@/lib/code-parser';
import { CodeValidator } from '@/lib/validators';

export function getValidationForProjectCode(code: string) {
  const parsed = parseGeneratedCode(code);
  const validator = new CodeValidator();
  const validation = validator.validateAll(parsed.html || '', parsed.css || '', parsed.javascript || '');
  return {
    html: parsed.html,
    css: parsed.css,
    js: parsed.javascript,
    validation,
  };
}
