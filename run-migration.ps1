# Manual Migration Helper Script
# This script helps you apply the Supabase integration migration to production

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Integration Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set your production database URL:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "your-database-url"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or create a .env file with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ DATABASE_URL found" -ForegroundColor Green
Write-Host ""

# Show options
Write-Host "Select an option:" -ForegroundColor Yellow
Write-Host "  1. Apply migration (add Supabase integration support)" -ForegroundColor White
Write-Host "  2. Rollback migration (remove Supabase integration support)" -ForegroundColor White
Write-Host "  3. View migration SQL (without applying)" -ForegroundColor White
Write-Host "  4. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Applying migration..." -ForegroundColor Yellow
        Write-Host ""
        
        # Use psql if available, otherwise use npx prisma db execute
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            psql $env:DATABASE_URL -f "migrations/manual-add-supabase-integration.sql"
        } else {
            npx prisma db execute --file migrations/manual-add-supabase-integration.sql --schema prisma/schema.prisma
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "  1. Run: npx prisma generate" -ForegroundColor Gray
            Write-Host "  2. Add Supabase OAuth credentials to .env" -ForegroundColor Gray
            Write-Host "  3. Test the auto-deployment flow" -ForegroundColor Gray
        } else {
            Write-Host ""
            Write-Host "❌ Migration failed!" -ForegroundColor Red
            Write-Host "Check the error messages above." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "⚠️  WARNING: This will delete all Supabase integration data!" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
        
        if ($confirm -eq "YES") {
            Write-Host ""
            Write-Host "Rolling back migration..." -ForegroundColor Yellow
            Write-Host ""
            
            if (Get-Command psql -ErrorAction SilentlyContinue) {
                psql $env:DATABASE_URL -f "migrations/rollback-supabase-integration.sql"
            } else {
                npx prisma db execute --file migrations/rollback-supabase-integration.sql --schema prisma/schema.prisma
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Rollback completed!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "❌ Rollback failed!" -ForegroundColor Red
            }
        } else {
            Write-Host "Rollback cancelled." -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Migration SQL:" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Gray
        Get-Content "migrations/manual-add-supabase-integration.sql"
        Write-Host "========================================" -ForegroundColor Gray
    }
    
    "4" {
        Write-Host "Exiting..." -ForegroundColor Gray
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
