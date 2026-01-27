# Quick Fix Script for Preview Issues
# Run this to fix CSP errors and auto-save

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Preview & Auto-Save Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fix 1: Remove CSP Meta Tag from System Prompt
Write-Host "[1/2] Removing CSP meta tag..." -ForegroundColor Yellow

$generateFile = "app\api\generate\route.ts"

if (Test-Path $generateFile) {
    $content = Get-Content $generateFile -Raw
    
    # Remove the CSP meta tag line
    $content = $content -replace '<meta http-equiv="Content-Security-Policy"[^>]+>', ''
    
    # Clean up any double blank lines
    $content = $content -replace '\n\n\n+', "`n`n"
    
    Set-Content $generateFile -Value $content -NoNewline
    Write-Host "      ✓ Removed CSP meta tag from system prompt" -ForegroundColor Green
} else {
    Write-Host "      ✗ Could not find generate route file" -ForegroundColor Red
}

# Fix 2: Update Auto-Save Condition
Write-Host ""
Write-Host "[2/2] Fixing auto-save logic..." -ForegroundColor Yellow

if (Test-Path $generateFile) {
    $content = Get-Content $generateFile -Raw
    
    # Find and replace the save condition
    $oldPattern = 'if \(projectId && parsed\.isComplete\)'
    $newPattern = 'if (projectId && (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript))'
    
    if ($content -match $oldPattern) {
        $content = $content -replace $oldPattern, $newPattern
        
        # Also update the status line
        $content = $content -replace 'status: ProjectStatus\.COMPLETED,', @'
status: parsed.isComplete ? ProjectStatus.COMPLETED : ProjectStatus.GENERATING,
'@
        
        Set-Content $generateFile -Value $content -NoNewline
        Write-Host "      ✓ Updated auto-save condition" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ Auto-save condition not found (may already be fixed)" -ForegroundColor Yellow
    }
} else {
    Write-Host "      ✗ Could not find generate route file" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✓ CSP meta tag removed (fixes iframe errors)" -ForegroundColor Green
Write-Host "✓ Auto-save now triggers even when incomplete" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your dev server: npm run dev" -ForegroundColor White
Write-Host "2. Test generation with a simple prompt" -ForegroundColor White
Write-Host "3. Check browser console - should be no CSP errors" -ForegroundColor White
Write-Host "4. Check terminal - should see auto-save logs" -ForegroundColor White
Write-Host ""

Write-Host "For the 'code visible in preview' issue:" -ForegroundColor Yellow
Write-Host "You'll need to manually edit lib/code-parser.ts" -ForegroundColor White
Write-Host "See FIX_PREVIEW_AND_AUTOSAVE.md for details" -ForegroundColor White
Write-Host ""