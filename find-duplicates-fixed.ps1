# Fix Remaining 57 TypeScript Errors
# Run in PowerShell from project root

Write-Host "Fixing remaining TypeScript errors..." -ForegroundColor Cyan

# Fix 1: userId → user_id in EmailSend
Write-Host "1. Fixing userId → user_id in EmailSend..." -ForegroundColor Yellow
$emailSend = "app\api\admin\campaigns\[id]\send\route.ts"
if (Test-Path $emailSend) {
    (Get-Content $emailSend -Raw) -replace 'userId: session\.user\.id', 'user_id: session.user.id' | Set-Content $emailSend -NoNewline
}

# Fix 2: user → User in Feedback includes
Write-Host "2. Fixing user → User in Feedback..." -ForegroundColor Yellow
$feedbackFile = "app\api\admin\feedback\route.ts"
if (Test-Path $feedbackFile) {
    $content = Get-Content $feedbackFile -Raw
    $content = $content -replace '(\s+)user: \{', '$1User: {'
    Set-Content $feedbackFile -Value $content -NoNewline
}

# Fix 3: project → Project in where/include clauses
Write-Host "3. Fixing project → Project..." -ForegroundColor Yellow
@(
    "app\api\domains\[id]\verify\route.ts",
    "app\api\domains\domainId\route.ts",
    "app\api\projects\render\route.ts"
) | ForEach-Object {
    if (Test-Path $_) {
        $content = Get-Content $_ -Raw
        $content = $content -replace 'project: \{', 'Project: {'
        Set-Content $_ -Value $content -NoNewline
    }
}

# Fix 4: pages → Page
Write-Host "4. Fixing pages → Page..." -ForegroundColor Yellow
$projectRoute = "app\api\projects\[id]\route.ts"
if (Test-Path $projectRoute) {
    (Get-Content $projectRoute -Raw) -replace 'pages: true', 'Page: true' | Set-Content $projectRoute -NoNewline
}

# Fix 5: Fix customDomain.project access → customDomain.Project
Write-Host "5. Fixing customDomain.project access..." -ForegroundColor Yellow
$renderRoute = "app\api\projects\render\route.ts"
if (Test-Path $renderRoute) {
    $content = Get-Content $renderRoute -Raw
    $content = $content -replace 'customDomain\.project', 'customDomain.Project'
    Set-Content $renderRoute -Value $content -NoNewline
}

# Fix 6: projectsLimit → projectLimit typo
Write-Host "6. Fixing projectsLimit typo..." -ForegroundColor Yellow
$checkLimits = "app\api\user\check-limits\route.ts"
if (Test-Path $checkLimits) {
    (Get-Content $checkLimits -Raw) -replace 'projectsLimit', 'projectLimit' | Set-Content $checkLimits -NoNewline
}

# Fix 7: workspace variable → workspaceData
Write-Host "7. Fixing workspace variable conflict..." -ForegroundColor Yellow
$workspaceProjects = "app\api\workspaces\[id]\projects\route.ts"
if (Test-Path $workspaceProjects) {
    $content = Get-Content $workspaceProjects -Raw
    # Fix the if condition
    $content = $content -replace 'if \(workspace && workspace\._count', 'if (workspaceData && workspaceData._count'
    $content = $content -replace 'workspace\.projectsLimit', 'workspaceData.projectsLimit'
    Set-Content $workspaceProjects -Value $content -NoNewline
}

# Fix 8: initialPages → initialPage prop
Write-Host "8. Fixing initialPages → initialPage..." -ForegroundColor Yellow
@(
    "app\dashboard\projects\[id]\navigation\page.tsx",
    "app\dashboard\projects\[id]\seo\page.tsx"
) | ForEach-Object {
    if (Test-Path $_) {
        (Get-Content $_ -Raw) -replace 'initialPages=', 'initialPage=' | Set-Content $_ -NoNewline
    }
}

# Fix 9: invite.Workspace → invite.workspace
Write-Host "9. Fixing Workspace → workspace in invite..." -ForegroundColor Yellow
$acceptInvite = "app\workspaces\accept-invite\page.tsx"
if (Test-Path $acceptInvite) {
    (Get-Content $acceptInvite -Raw) -replace 'invite\.Workspace', 'invite.workspace' | Set-Content $acceptInvite -NoNewline
}

# Fix 10: WorkspaceMember variable → workspaceMemberships  
Write-Host "10. Fixing WorkspaceMember variable..." -ForegroundColor Yellow
$workspacesPage = "app\workspaces\page.tsx"
if (Test-Path $workspacesPage) {
    $content = Get-Content $workspacesPage -Raw
    $content = $content -replace 'const workspaces = WorkspaceMember\.map', 'const workspaces = workspaceMemberships.map'
    Set-Content $workspacesPage -Value $content -NoNewline
}

Write-Host ""
Write-Host "Automated fixes complete!" -ForegroundColor Green
Write-Host "This should have fixed ~20 errors" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining manual fixes (3 files):" -ForegroundColor Yellow
Write-Host "1. lib/validator.ts - Add severity field (31 errors)"
Write-Host "2. app/api/cron/drip-emails/route.ts - Fix JSON types (3 errors)"  
Write-Host "3. app/api/user/check-limits/route.ts - Add _count include (3 errors)"
Write-Host ""
Write-Host "Next: Run 'npx tsc --noEmit' to verify" -ForegroundColor Cyan