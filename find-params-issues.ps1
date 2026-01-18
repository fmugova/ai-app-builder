# find-params-issues.ps1
# Finds all files that access params without awaiting

Write-Host "🔍 Finding files with params access issues..." -ForegroundColor Cyan
Write-Host ""

$issues = @()

# Find all TypeScript files
$files = Get-ChildItem -Path "app" -Filter "*.ts*" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file has Promise params type
    if ($content -match 'params:\s*Promise<') {
        # Check if it accesses params.something without await
        if ($content -match 'params\.\w+' -and $content -notmatch 'await\s+(context\.)?params') {
            $issues += $file.FullName
            
            # Find the specific line
            $lines = Get-Content $file.FullName
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match 'params\.\w+' -and $lines[$i] -notmatch 'await') {
                    Write-Host "❌ $($file.FullName)" -ForegroundColor Red
                    Write-Host "   Line $($i + 1): $($lines[$i].Trim())" -ForegroundColor Yellow
                    Write-Host ""
                    break
                }
            }
        }
    }
}

Write-Host "=" * 80
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "✅ No issues found!" -ForegroundColor Green
    Write-Host "You can run: npm run build" -ForegroundColor Cyan
} else {
    Write-Host "Found $($issues.Count) files with params access issues" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix pattern:" -ForegroundColor Yellow
    Write-Host "  Add this line at the start of each function:" -ForegroundColor White
    Write-Host "  const { id } = await context.params" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Then change:" -ForegroundColor White
    Write-Host "  where: { id: params.id }  ❌" -ForegroundColor Red
    Write-Host "  to:" -ForegroundColor White
    Write-Host "  where: { id }  ✅" -ForegroundColor Green
}