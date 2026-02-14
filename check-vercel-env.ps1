# Check Vercel Environment Variables
Write-Host "🔍 Checking Vercel Environment Variables..." -ForegroundColor Cyan

$projectId = $env:VERCEL_PROJECT_ID
$token = $env:VERCEL_API_TOKEN

if (-not $projectId -or -not $token) {
    Write-Host "❌ Missing VERCEL_PROJECT_ID or VERCEL_API_TOKEN in .env.local" -ForegroundColor Red
    exit 1
}

# Get environment variables from Vercel
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId/env"

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    
    Write-Host "`n✅ Environment Variables in Vercel:" -ForegroundColor Green
    
    $criticalVars = @("NEXTAUTH_URL", "NEXTAUTH_SECRET", "DATABASE_URL", "ANTHROPIC_API_KEY", "STRIPE_SECRET_KEY")
    
    foreach ($var in $criticalVars) {
        $found = $response.envs | Where-Object { $_.key -eq $var }
        if ($found) {
            $targetEnvs = @()
            foreach ($t in $found.target) {
                $targetEnvs += $t
            }
            $target = $targetEnvs -join ", "
            
            # Mask the value for security
            $maskedValue = "********"
            if ($found.value) {
                $valueLength = $found.value.Length
                if ($valueLength -gt 8) {
                    $maskedValue = $found.value.Substring(0, 4) + "****" + $found.value.Substring($valueLength - 4)
                }
            }
            
            Write-Host "  ✓ $var (target: $target) [Value: $maskedValue]" -ForegroundColor Green
        }
        else {
            Write-Host "  ✗ $var - MISSING!" -ForegroundColor Red
        }
    }
    
    Write-Host "`n💡 To add missing variables:" -ForegroundColor Yellow
    Write-Host "   vercel env add VARIABLE_NAME production" -ForegroundColor Gray
    Write-Host "`n🔒 Note: Values are masked for security" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Failed to fetch Vercel environment variables" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
