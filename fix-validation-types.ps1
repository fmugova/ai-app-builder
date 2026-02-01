# fix-validation-types.ps1
# Automate the shared types fix

Write-Host "🔧 Fixing ValidationResult type conflict..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create lib/types directory
Write-Host "📁 Creating lib/types directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "lib\types" -Force -ErrorAction SilentlyContinue | Out-Null
Write-Host "✓ Directory created" -ForegroundColor Green

# Step 2: Copy validation types file
Write-Host ""
Write-Host "📝 Creating shared validation types..." -ForegroundColor Yellow
if (Test-Path "$env:USERPROFILE\Downloads\validation-types.ts") {
    Copy-Item "$env:USERPROFILE\Downloads\validation-types.ts" "lib\types\validation.ts" -Force
    Write-Host "✓ Shared types file created: lib/types/validation.ts" -ForegroundColor Green
} else {
    Write-Host "❌ validation-types.ts not found in Downloads" -ForegroundColor Red
    Write-Host "Please download the file first!" -ForegroundColor Yellow
    exit 1
}

# Step 3: Update ChatBuilder
Write-Host ""
Write-Host "🔄 Updating ChatBuilder..." -ForegroundColor Yellow
if (Test-Path "$env:USERPROFILE\Downloads\chatbuilder-shared-types.tsx") {
    Copy-Item "$env:USERPROFILE\Downloads\chatbuilder-shared-types.tsx" "app\chat-builder\page.tsx" -Force
    Write-Host "✓ ChatBuilder updated" -ForegroundColor Green
} else {
    Write-Host "❌ chatbuilder-shared-types.tsx not found in Downloads" -ForegroundColor Red
    exit 1
}

# Step 4: Check if PreviewFrame needs updating
Write-Host ""
Write-Host "🔍 Checking PreviewFrame..." -ForegroundColor Yellow
if (Test-Path "components\PreviewFrame.tsx") {
    $previewContent = Get-Content "components\PreviewFrame.tsx" -Raw

    if ($previewContent -match "import.*ValidationResult.*from.*['`"]@/lib/types/validation['`"]") {
        Write-Host "✓ PreviewFrame already imports from shared types" -ForegroundColor Green
    } elseif ($previewContent -match "interface ValidationResult") {
        Write-Host "⚠️  PreviewFrame has local ValidationResult type" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "ACTION REQUIRED:" -ForegroundColor Red
        Write-Host "1. Open components/PreviewFrame.tsx" -ForegroundColor Yellow
        Write-Host "2. Add import: import type { ValidationResult, ValidationError } from '@/lib/types/validation'" -ForegroundColor Yellow
        Write-Host "3. Remove local ValidationResult/ValidationError type definitions" -ForegroundColor Yellow
    } else {
        Write-Host "✓ PreviewFrame doesn't define these types (OK)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  PreviewFrame.tsx not found" -ForegroundColor Yellow
}

# Step 5: Clear caches
Write-Host ""
Write-Host "🧹 Clearing caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Write-Host "✓ Caches cleared" -ForegroundColor Green

# Step 6: Build
Write-Host ""
Write-Host "🔨 Building project..." -ForegroundColor Yellow
Write-Host ""
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! All fixes applied and build passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  ✓ Created lib/types/validation.ts" -ForegroundColor White
    Write-Host "  ✓ Updated app/chat-builder/page.tsx" -ForegroundColor White
    Write-Host "  ✓ Build succeeded" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Build failed. Please check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. PreviewFrame might need manual update" -ForegroundColor White
    Write-Host "  2. Check tsconfig.json has @/* path alias" -ForegroundColor White
    Write-Host "  3. Run: tsc --noEmit for detailed errors" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")