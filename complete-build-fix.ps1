# Complete Build Fix - ESLint + authOptions
# PowerShell script - Run this to fix both errors

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Error Auto-Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fix 1: ESLint Config
Write-Host "[1/3] Fixing ESLint configuration..." -ForegroundColor Yellow

$eslintConfig = @'
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
'@

$eslintConfig | Out-File -FilePath .eslintrc.json -Encoding utf8 -Force
Write-Host "      ✓ ESLint config updated to minimal config" -ForegroundColor Green

# Fix 2: Export authOptions
Write-Host ""
Write-Host "[2/3] Fixing authOptions export..." -ForegroundColor Yellow

$authFile = "app\api\auth\[...nextauth]\route.ts"

if (Test-Path $authFile) {
    $content = Get-Content $authFile -Raw
    
    # Check if authOptions exists but is not exported
    if ($content -match "const authOptions" -and $content -notmatch "export const authOptions") {
        Write-Host "      Found authOptions without export, adding export keyword..." -ForegroundColor Gray
        $content = $content -replace "(?<!export )const authOptions", "export const authOptions"
        Set-Content $authFile -Value $content -NoNewline
        Write-Host "      ✓ Added 'export' to authOptions" -ForegroundColor Green
    }
    elseif ($content -match "export const authOptions") {
        Write-Host "      ✓ authOptions already exported" -ForegroundColor Green
    }
    else {
        Write-Host "      ⚠ Could not find authOptions in auth route" -ForegroundColor Yellow
        Write-Host "      Checking lib/auth.ts instead..." -ForegroundColor Gray
        
        # Try lib/auth.ts
        if (Test-Path "lib\auth.ts") {
            Write-Host "      ✓ Found lib/auth.ts - will use this for import" -ForegroundColor Green
            
            # Update domains route to import from lib/auth
            $domainsFile = "app\api\domains\[id]\route.ts"
            if (Test-Path $domainsFile) {
                $domainContent = Get-Content $domainsFile -Raw
                $domainContent = $domainContent -replace "@/app/api/auth/\[\.\.\.nextauth\]/route", "@/lib/auth"
                Set-Content $domainsFile -Value $domainContent -NoNewline
                Write-Host "      ✓ Updated domains route to import from lib/auth" -ForegroundColor Green
            }
        }
        else {
            Write-Host "      ✗ Could not find authOptions - manual fix needed" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "      ⚠ Auth route file not found at: $authFile" -ForegroundColor Yellow
}

# Fix 3: Verify Prisma query (Project -> project)
Write-Host ""
Write-Host "[3/3] Verifying Prisma queries..." -ForegroundColor Yellow

$domainsFile = "app\api\domains\[id]\route.ts"
if (Test-Path $domainsFile) {
    $content = Get-Content $domainsFile -Raw
    
    if ($content -match "Project: \{") {
        Write-Host "      Found 'Project: {' - fixing to 'project: {' (lowercase)..." -ForegroundColor Gray
        $content = $content -replace "Project: \{", "project: {"
        Set-Content $domainsFile -Value $content -NoNewline
        Write-Host "      ✓ Fixed Prisma relation name casing" -ForegroundColor Green
    }
    else {
        Write-Host "      ✓ Prisma queries look correct" -ForegroundColor Green
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test ESLint config
if (Test-Path .eslintrc.json) {
    $eslintContent = Get-Content .eslintrc.json -Raw
    if ($eslintContent -match "useEslintrc" -or $eslintContent -match '"extensions"') {
        Write-Host "✗ ESLint config still has issues" -ForegroundColor Red
    }
    else {
        Write-Host "✓ ESLint config is correct" -ForegroundColor Green
    }
}

# Test authOptions
if (Test-Path $authFile) {
    $authContent = Get-Content $authFile -Raw
    if ($authContent -match "export const authOptions") {
        Write-Host "✓ authOptions is exported" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ authOptions export status unknown" -ForegroundColor Yellow
    }
}
elseif (Test-Path "lib\auth.ts") {
    Write-Host "✓ Using lib/auth.ts for authOptions" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Build..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run build
npm run build

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If build succeeded: Ready to deploy! 🚀" -ForegroundColor Green
Write-Host "If build failed: Check error messages above" -ForegroundColor Yellow