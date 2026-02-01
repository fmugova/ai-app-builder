# fix-validator.ps1
# PowerShell script to fix the validator

Write-Host "🔧 Fixing CodeValidator..." -ForegroundColor Cyan
Write-Host ""

# 1. Check if download file exists
$downloadFile = "$env:USERPROFILE\Downloads\code-validator-strictest.ts"
if (-not (Test-Path $downloadFile)) {
    Write-Host "❌ File not found: $downloadFile" -ForegroundColor Red
    Write-Host "   Please download the file first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found downloaded file" -ForegroundColor Green

# 2. Backup existing file
$targetFile = "lib\validators\code-validator.ts"
$backupFile = "lib\validators\code-validator.ts.backup"

if (Test-Path $targetFile) {
    Copy-Item $targetFile $backupFile -Force
    Write-Host "✓ Backed up existing file" -ForegroundColor Green
}

# 3. Replace file
Copy-Item $downloadFile $targetFile -Force
Write-Host "✓ Replaced code-validator.ts" -ForegroundColor Green

# 4. Clear caches
Write-Host ""
Write-Host "🧹 Clearing caches..." -ForegroundColor Cyan

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Cleared .next" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Cleared node_modules/.cache" -ForegroundColor Green
}

# 5. Clear Jest cache
Write-Host ""
Write-Host "🧹 Clearing Jest cache..." -ForegroundColor Cyan
& npm test -- --clearCache 2>&1 | Out-Null
Write-Host "✓ Cleared Jest cache" -ForegroundColor Green

# 6. Run tests
Write-Host ""
Write-Host "🧪 Running tests..." -ForegroundColor Cyan
Write-Host ""
& npm test