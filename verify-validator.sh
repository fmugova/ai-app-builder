#!/bin/bash
# verify-validator.sh
# Check if code-validator.ts has the critical error logic

echo "🔍 Checking code-validator.ts..."
echo ""

FILE="lib/validators/code-validator.ts"

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "✓ File exists"
echo ""

# Check for hasCriticalError variable
if grep -q "hasCriticalError" "$FILE"; then
  echo "✅ Has hasCriticalError tracking"
else
  echo "❌ Missing hasCriticalError tracking"
  echo "   The file needs to be updated!"
  exit 1
fi

# Check for critical DOCTYPE check
if grep -q "Missing DOCTYPE.*critical" "$FILE"; then
  echo "✅ Has critical DOCTYPE check"
else
  echo "❌ Missing critical DOCTYPE check"
  echo "   The file needs to be updated!"
  exit 1
fi

# Check for proper passed logic
if grep -q "!this.hasCriticalError" "$FILE"; then
  echo "✅ Has critical error auto-fail logic"
else
  echo "❌ Missing critical error auto-fail logic"
  echo "   The file needs to be updated!"
  exit 1
fi

# Check for minimal HTML detection
if grep -q "!html.includes('<html')" "$FILE"; then
  echo "✅ Has minimal HTML detection"
else
  echo "❌ Missing minimal HTML detection"
  echo "   The file needs to be updated!"
  exit 1
fi

echo ""
echo "✅ All checks passed! Validator should work correctly."
echo ""
echo "If tests still fail, try:"
echo "  rm -rf node_modules/.cache"
echo "  npm test -- --clearCache"
echo "  npm test"