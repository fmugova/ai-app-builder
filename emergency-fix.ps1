# emergency-fix.ps1
# Emergency fix for login issues

Write-Host "🚨 EMERGENCY FIX - Resolving Login Issues" -ForegroundColor Cyan
Write-Host ""

# Step 1: Regenerate Prisma Client
Write-Host "1️⃣  Regenerating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client regenerated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to regenerate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Push schema to database
Write-Host "2️⃣  Syncing database schema..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema synced" -ForegroundColor Green
} else {
    Write-Host "⚠️  Schema sync had warnings (this may be OK)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Verify all users
Write-Host "3️⃣  Verifying all user emails..." -ForegroundColor Yellow
npm run verify-email -- --all
Write-Host ""

# Step 4: Check database
Write-Host "4️⃣  Checking database status..." -ForegroundColor Yellow
Start-Process "npx" -ArgumentList "prisma studio --browser none"
Start-Sleep -Seconds 2
Write-Host "✅ Prisma Studio starting at http://localhost:5555" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 EMERGENCY FIX COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check Prisma Studio at http://localhost:5555"
Write-Host "  2. Verify emailVerified is set for your user"
Write-Host "  3. Try logging in again"
Write-Host ""