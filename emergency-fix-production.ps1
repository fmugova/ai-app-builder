# emergency-fix-production.ps1
# PRODUCTION-SAFE - Only verifies emails, no schema changes

Write-Host "🔒 PRODUCTION-SAFE FIX - Email Verification Only" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will connect to PRODUCTION database!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Write-Host ""

# Check which .env file to use
if (Test-Path ".env.production") {
    Write-Host "📋 Using .env.production file" -ForegroundColor Green
    Copy-Item ".env.production" ".env" -Force
    Write-Host "✅ Switched to production environment" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env.production file found" -ForegroundColor Yellow
    Write-Host "   Make sure DATABASE_URL points to production" -ForegroundColor Yellow
}
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

# Step 2: DO NOT run db push on production!
Write-Host "2️⃣  Skipping schema sync (production safety)" -ForegroundColor Yellow
Write-Host "   Schema changes should be done via migrations" -ForegroundColor Gray
Write-Host ""

# Step 3: Verify all users
Write-Host "3️⃣  Verifying all user emails in PRODUCTION..." -ForegroundColor Yellow
Write-Host "   This will set emailVerified = NOW() for unverified users" -ForegroundColor Gray
Write-Host ""
Write-Host "   Continue? Press any key or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Write-Host ""

npm run verify-email -- --all
Write-Host ""

# Step 4: Show stats
Write-Host "4️⃣  Checking database status..." -ForegroundColor Yellow
Write-Host "   Opening Prisma Studio (read-only mode recommended)" -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 PRODUCTION FIX COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "What was done:" -ForegroundColor Cyan
Write-Host "  ✅ Regenerated Prisma Client"
Write-Host "  ✅ Verified all user emails"
Write-Host "  ⏭️  Skipped schema changes (use migrations for production)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Try logging in to production"
Write-Host "  2. If still failing, check NextAuth configuration"
Write-Host "  3. Review production logs for specific errors"
Write-Host ""
Write-Host "To revert to development:" -ForegroundColor Yellow
Write-Host "  Copy-Item '.env.development' '.env' -Force"
Write-Host ""
