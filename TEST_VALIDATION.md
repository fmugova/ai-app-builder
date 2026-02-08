# Test Validation Pipeline

## Quick Test

Test with minimal HTML (should trigger all fixes):
```bash
curl -X POST http://localhost:3000/api/test-validation \
  -H "Content-Type: application/json" \
  -d '{"html": "<html><body>Test</body></html>"}'
```

## Test with Better HTML (should need fewer fixes):
```bash
curl -X POST http://localhost:3000/api/test-validation \
  -H "Content-Type: application/json" \
  -d '{"html": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Test Page</title></head><body><h1>Test Page</h1><p>Content here</p></body></html>"}'
```

## Test with Perfect HTML (should pass without fixes):
```bash
curl -X POST http://localhost:3000/api/test-validation \
  -H "Content-Type: application/json" \
  -d '{"html": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><meta name=\"description\" content=\"Test page description\"><title>Test Page</title></head><body><h1>Test Page</h1><p>Content here</p></body></html>"}'
```

## Get Usage Instructions:
```bash
curl http://localhost:3000/api/test-validation
```

## PowerShell Examples

### Minimal HTML Test:
```powershell
$body = @{
    html = "<html><body>Test</body></html>"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-validation" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Complete HTML Test:
```powershell
$body = @{
    html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Test page">
    <title>Test Page</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>Content here</p>
</body>
</html>
"@
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-validation" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

## Expected Output

The endpoint returns a detailed breakdown:

```json
{
  "success": true,
  "stages": {
    "step1_original": {
      "score": 45,
      "passed": false,
      "errors": 3,
      "warnings": 2,
      "issues": [...]
    },
    "step2_autoFix": {
      "appliedFixes": ["Added DOCTYPE declaration", "Added lang attribute", ...],
      "remainingIssues": 1,
      "codeLengthBefore": 30,
      "codeLengthAfter": 250
    },
    "step3_revalidation": {
      "score": 85,
      "passed": true,
      "errors": 0,
      "warnings": 1,
      "scoreImprovement": 40
    },
    "step4_templateWrapper": {
      "applied": true,
      "score": 98,
      "passed": true,
      "errors": 0,
      "warnings": 0
    }
  },
  "finalCode": "<!DOCTYPE html>...",
  "summary": {
    "originalScore": 45,
    "finalScore": 98,
    "improvement": 53,
    "allStepsNeeded": true
  }
}
```

## Console Output

When you run the test, check the server console for detailed logs:

```
🧪 Testing validation system...
📝 Input HTML length: 30

=== STEP 1: INITIAL VALIDATION ===
📊 Validation results: { score: 45, passed: false, errors: 3, warnings: 2 }

=== STEP 2: AUTO-FIX ===
🔧 AUTO-FIXER STARTING...
📊 Total issues found: 5
🔧 Adding lang attribute...
🔧 Adding missing title tag...
🔧 Adding missing h1...
✅ Applied fixes: ['Added lang attribute...', 'Added missing title...']
📏 Code length change: 30 → 250 (+220)

=== STEP 3: RE-VALIDATION AFTER AUTO-FIX ===
📊 Re-validation results: { score: 85, passed: true, errors: 0, warnings: 1 }

=== STEP 4: TEMPLATE WRAPPER CHECK ===
⚠️ Score too low (85), applying template wrapper
🛡️ TEMPLATE WRAPPER: Checking HTML structure...
🔥 APPLYING TEMPLATE WRAPPER (LAST RESORT)
✅ Template wrapper applied successfully

=== SUMMARY ===
Original score: 45
After auto-fix: 85 (+40)
Final score: 98
Template wrapper used: true
```
