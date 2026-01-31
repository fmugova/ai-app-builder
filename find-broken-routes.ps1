# find-broken-routes.ps1
# PowerShell script to find all routes with async params issues

Write-Host "🔍 Finding all dynamic routes that need fixing..." -ForegroundColor Cyan
Write-Host ""

# Find all route files with [param] in path
$routes = Get-ChildItem -Path "app/api" -Filter "route.ts" -Recurse | Where-Object {
    $_.FullName -match '\[.*?\]'
}

Write-Host "📋 Found $($routes.Count) dynamic routes:" -ForegroundColor Yellow
Write-Host ""

$needsFixing = @()

foreach ($route in $routes) {
    $content = Get-Content $route.FullName -Raw
    
    # Check if it has the OLD pattern
    $hasOldPattern = $content -match '\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{'
    
    # Check if it already has the NEW pattern
    $hasNewPattern = $content -match 'params:\s*Promise<\{'
    
    if ($hasOldPattern -and -not $hasNewPattern) {
        $relativePath = $route.FullName.Replace((Get-Location).Path + "\", "")
        $needsFixing += $relativePath
        Write-Host "❌ NEEDS FIX: $relativePath" -ForegroundColor Red
    }
    elseif ($hasNewPattern) {
        $relativePath = $route.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "✅ Already fixed: $relativePath" -ForegroundColor Green
    }
    else {
        $relativePath = $route.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "⚠️  Check manually: $relativePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($needsFixing.Count -gt 0) {
    Write-Host "🔧 Routes that NEED fixing: $($needsFixing.Count)" -ForegroundColor Red
    Write-Host ""
    foreach ($route in $needsFixing) {
        Write-Host "   • $route"
    }
    Write-Host ""
    Write-Host "To fix each route, change:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ❌ OLD:" -ForegroundColor Red
    Write-Host "  export async function GET(request: Request, { params }: { params: { id: string } })"
    Write-Host ""
    Write-Host "  ✅ NEW:" -ForegroundColor Green
    Write-Host "  interface RouteContext { params: Promise<{ id: string }> }"
    Write-Host "  export async function GET(request: NextRequest, context: RouteContext) {"
    Write-Host "    const { id } = await context.params;"
    Write-Host ""
}
else {
    Write-Host "✨ All dynamic routes are already fixed!" -ForegroundColor Green
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan