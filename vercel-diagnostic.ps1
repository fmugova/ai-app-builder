# Vercel Deployment Diagnostic Script (PowerShell)
# Run this to gather all diagnostic information at once

Write-Host "VERCEL DEPLOYMENT DIAGNOSTICS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repo
try {
    git rev-parse --git-dir 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Not in a git repository" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Git not installed or not in a git repository" -ForegroundColor Red
    exit 1
}

Write-Host "REPOSITORY INFO" -ForegroundColor Yellow
Write-Host "-------------------"
Write-Host "Repository: $(git config --get remote.origin.url)"
Write-Host "Current Branch: $(git branch --show-current)"
Write-Host "Latest Commit: $(git log -1 --oneline)"
Write-Host "Commit SHA: $(git rev-parse HEAD)"
Write-Host ""

Write-Host "RECENT COMMITS" -ForegroundColor Yellow
Write-Host "-------------------"
git log --oneline -5
Write-Host ""

Write-Host "VERCEL CONFIGURATION FILES" -ForegroundColor Yellow
Write-Host "-------------------"

# Check for vercel.json
if (Test-Path "vercel.json") {
    Write-Host "[OK] vercel.json found:" -ForegroundColor Green
    Get-Content "vercel.json"
} else {
    Write-Host "[INFO] No vercel.json (using defaults)" -ForegroundColor Gray
}
Write-Host ""

# Check for .vercelignore
if (Test-Path ".vercelignore") {
    Write-Host "[WARNING] .vercelignore found:" -ForegroundColor Yellow
    Get-Content ".vercelignore"
} else {
    Write-Host "[INFO] No .vercelignore" -ForegroundColor Gray
}
Write-Host ""

Write-Host "PACKAGE.JSON SCRIPTS" -ForegroundColor Yellow
Write-Host "-------------------"
if (Test-Path "package.json") {
    Write-Host "Build script:"
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.scripts.build) {
        Write-Host "  $($packageJson.scripts.build)"
    } else {
        Write-Host "  Not found"
    }
    Write-Host ""
    Write-Host "Dev script:"
    if ($packageJson.scripts.dev) {
        Write-Host "  $($packageJson.scripts.dev)"
    } else {
        Write-Host "  Not found"
    }
} else {
    Write-Host "❌ No package.json found" -ForegroundColor Red
}
Write-Host ""

Write-Host "FILE STRUCTURE" -ForegroundColor Yellow
Write-Host "-------------------"
Write-Host "Key files/directories:"
Get-ChildItem | Where-Object { $_.PSIsContainer -or $_.Name -match "package\.json|vercel\.json|next\.config|tsconfig" } | Select-Object -First 10
Write-Host ""

Write-Host "DEPENDENCIES STATUS" -ForegroundColor Yellow
Write-Host "-------------------"
if (Test-Path "package.json") {
    Write-Host "Next.js version:"
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.next) {
        Write-Host "  next: $($packageJson.dependencies.next)"
    } else {
        Write-Host "  Not found"
    }
    Write-Host ""
    Write-Host "Node modules installed:"
    if (Test-Path "node_modules") {
        Write-Host "  [OK] Yes" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] No - Run: npm install" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No package.json" -ForegroundColor Red
}
Write-Host ""

Write-Host "ENVIRONMENT VARIABLES" -ForegroundColor Yellow
Write-Host "-------------------"
if (Test-Path ".env.local") {
    Write-Host "[OK] .env.local exists" -ForegroundColor Green
    Write-Host "Variables defined (values hidden):"
    Get-Content ".env.local" | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
        $varName = ($_ -split '=')[0]
        Write-Host "  $varName=***HIDDEN***"
    }
} else {
    Write-Host "[WARNING] No .env.local file" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "VERCEL CLI CHECK" -ForegroundColor Yellow
Write-Host "-------------------"
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelInstalled) {
    Write-Host "[OK] Vercel CLI installed" -ForegroundColor Green
    vercel --version
    Write-Host ""
    Write-Host "Linked project:"
    if (Test-Path ".vercel/project.json") {
        $projectJson = Get-Content ".vercel/project.json" -Raw | ConvertFrom-Json
        Write-Host "  Project ID: $($projectJson.projectId)"
        Write-Host "  Org ID: $($projectJson.orgId)"
    } else {
        Write-Host "  [ERROR] Not linked - Run: vercel link" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Vercel CLI not installed" -ForegroundColor Red
    Write-Host "   Install: npm i -g vercel"
}
Write-Host ""

Write-Host "COMMON ISSUES CHECK" -ForegroundColor Yellow
Write-Host "-------------------"

$issuesFound = 0

# Check if node_modules is committed
$nodeModulesCommitted = git ls-files | Select-String "node_modules/"
if ($nodeModulesCommitted) {
    Write-Host "[WARNING] node_modules appears to be committed to git" -ForegroundColor Yellow
    Write-Host "   This can cause deployment issues"
    $issuesFound++
}

# Check if .next is in .gitignore
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -notmatch "\.next") {
        Write-Host "[WARNING] .next not in .gitignore" -ForegroundColor Yellow
        Write-Host "   Build output might be committed"
        $issuesFound++
    }
} else {
    Write-Host "[WARNING] No .gitignore file" -ForegroundColor Yellow
    $issuesFound++
}

# Check for vercel.json with disabled deployments
if (Test-Path "vercel.json") {
    $vercelContent = Get-Content "vercel.json" -Raw
    if ($vercelContent -match '"enabled"\s*:\s*false') {
        Write-Host "[CRITICAL] Auto-deploy disabled in vercel.json" -ForegroundColor Red
        Write-Host "   Remove 'enabled: false' setting"
        $issuesFound++
    }
}

# Check if main branch exists
$mainExists = git show-ref --verify --quiet refs/heads/main 2>&1
$masterExists = git show-ref --verify --quiet refs/heads/master 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] No 'main' or 'master' branch found" -ForegroundColor Yellow
    Write-Host "   Current branch: $(git branch --show-current)"
    $issuesFound++
}

if ($issuesFound -eq 0) {
    Write-Host "[OK] No common issues detected" -ForegroundColor Green
}
Write-Host ""

Write-Host "RECOMMENDED ACTIONS" -ForegroundColor Yellow
Write-Host "-------------------"
$repoUrl = git config --get remote.origin.url
$repoPath = $repoUrl -replace '.*github\.com[:/](.*)\.git', '$1'
Write-Host "1. Check GitHub webhook:"
Write-Host "   -> https://github.com/$repoPath/settings/hooks"
Write-Host ""
Write-Host "2. Check Vercel deployments:"
Write-Host "   -> https://vercel.com/dashboard"
Write-Host ""
Write-Host "3. Force manual deployment:"
Write-Host "   -> Vercel Dashboard -> Deployments -> Deploy button"
Write-Host ""
Write-Host "4. Test with trivial commit:"
Write-Host "   $ echo '# Test' >> README.md"
Write-Host "   $ git add README.md"
Write-Host "   $ git commit -m 'Test deployment trigger'"
Write-Host "   $ git push origin $(git branch --show-current)"
Write-Host ""

Write-Host "=== DIAGNOSTIC COMPLETE ===" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Compare this output with Vercel dashboard settings"
Write-Host "2. Verify commit SHA matches latest deployment"
Write-Host "3. Check GitHub webhook recent deliveries"
Write-Host "4. If webhook failing -> Reconnect Vercel Git integration"
Write-Host ""
