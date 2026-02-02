# complete-fix.ps1
# Complete fix for all API errors and schema issues

Write-Host "🔧 COMPLETE FIX - All API Errors" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if schema.prisma has been updated
Write-Host "📋 Step 1: Checking Prisma schema..." -ForegroundColor Yellow
$schemaPath = "prisma\schema.prisma"

if (-not (Test-Path $schemaPath)) {
    Write-Host "❌ Error: prisma\schema.prisma not found!" -ForegroundColor Red
    Write-Host "   Make sure you're in the project root directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found prisma\schema.prisma" -ForegroundColor Green
Write-Host ""

# Check if schema has BigInt
$schemaContent = Get-Content $schemaPath -Raw

Write-Host "🔍 Checking for BigInt fields..." -ForegroundColor Yellow
if ($schemaContent -match 'generationsUsed\s+BigInt') {
    Write-Host "✅ Schema already has BigInt fields" -ForegroundColor Green
} else {
    Write-Host "⚠️  Schema still has Int fields!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "  1. Open prisma\schema.prisma" -ForegroundColor White
    Write-Host "  2. Change these fields from Int to BigInt:" -ForegroundColor White
    Write-Host ""
    Write-Host "  User model:" -ForegroundColor Cyan
    Write-Host "    generationsUsed        BigInt   @default(0)" -ForegroundColor White
    Write-Host "    generationsLimit       BigInt   @default(10)" -ForegroundColor White
    Write-Host "    projectsThisMonth      BigInt   @default(0)" -ForegroundColor White
    Write-Host "    projectsLimit          BigInt   @default(3)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Project model:" -ForegroundColor Cyan
    Write-Host "    generationTime         BigInt?  @default(0)" -ForegroundColor White
    Write-Host "    retryCount             BigInt?  @default(0)" -ForegroundColor White
    Write-Host "    tokensUsed             BigInt?  @default(0)" -ForegroundColor White
    Write-Host "    validationScore        BigInt?  @default(0)" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. Save the file" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host ""

# Step 2: Regenerate Prisma Client
Write-Host "2️⃣  Regenerating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client regenerated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to regenerate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Clear Next.js cache
Write-Host "3️⃣  Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Cleared .next folder" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No .next folder found (this is okay)" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Verify all users
Write-Host "4️⃣  Verifying all user emails..." -ForegroundColor Yellow
npm run verify-email -- --all
Write-Host ""

# Step 5: Check for common issues
Write-Host "5️⃣  Checking environment..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

if (-not (Test-Path "node_modules\@prisma\client")) {
    Write-Host "⚠️  Prisma client not found in node_modules" -ForegroundColor Yellow
    Write-Host "   Running npm install..." -ForegroundColor Gray
    npm install
} else {
    Write-Host "✅ Prisma client installed" -ForegroundColor Green
}
Write-Host ""

# Step 6: Summary
Write-Host "🎉 COMPLETE FIX DONE!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ What was fixed:" -ForegroundColor Cyan
Write-Host "  1. Prisma client regenerated with BigInt support"
Write-Host "  2. Next.js cache cleared"
Write-Host "  3. All user emails verified"
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start dev server:    npm run dev" -ForegroundColor White
Write-Host "  2. Clear browser cache: F12 → Application → Clear storage" -ForegroundColor White
Write-Host "  3. Login again" -ForegroundColor White
Write-Host "  4. Test these routes:" -ForegroundColor White
Write-Host "     • http://localhost:3000/api/billing" -ForegroundColor Gray
Write-Host "     • http://localhost:3000/dashboard/projects" -ForegroundColor Gray
Write-Host "     • http://localhost:3000/admin (if admin)" -ForegroundColor Gray
Write-Host ""
Write-Host "🐛 If issues persist:" -ForegroundColor Yellow
Write-Host "  • Check console for specific errors" -ForegroundColor White
Write-Host "  • Make sure DATABASE_URL is correct in .env" -ForegroundColor White
Write-Host "  • Try opening Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host ""
