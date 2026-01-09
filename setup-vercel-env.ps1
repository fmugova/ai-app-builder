# Setup Vercel Environment Variables
# This script adds the missing NEXT_PUBLIC_ variables to your Vercel project

Write-Host "=== Adding Missing Environment Variables to Vercel ===" -ForegroundColor Cyan
Write-Host ""

# Variables to add
$vars = @{
    "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID" = "price_1SYaBjC8WSP1936WrOHxrAms"
    "NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID" = "price_1SYaDrC8WSP1936WdTbWFrBk"
    "NEXT_PUBLIC_APP_URL" = "https://buildflow-ai.app"
    "NEXT_PUBLIC_APP_NAME" = "BuildFlow"
}

foreach ($key in $vars.Keys) {
    Write-Host "Adding $key..." -ForegroundColor Yellow
    
    # Use echo to pipe the value to vercel env add
    $value = $vars[$key]
    $command = "echo `"$value`" | vercel env add $key production --yes"
    
    try {
        Invoke-Expression $command
        Write-Host "  ✓ Added $key" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to add $key" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "=== Environment Variables Added ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify variables: vercel env ls" -ForegroundColor White
Write-Host "2. Trigger deployment: vercel --prod" -ForegroundColor White
Write-Host "   OR redeploy from Vercel dashboard" -ForegroundColor White
Write-Host ""
