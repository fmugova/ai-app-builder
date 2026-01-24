# Automated TypeScript Error Fixes (PowerShell)
# Run this in your project root: .\fix-errors.ps1

Write-Host "🔧 Fixing TypeScript errors..." -ForegroundColor Cyan

function Update-InFiles {
    param(
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )
    Write-Host "Fixing $Description..." -ForegroundColor Yellow
    Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse -File |
        Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
        ForEach-Object {
            $content = Get-Content $_.FullName -Raw
            $newContent = $content -replace $Pattern, $Replacement
            if ($content -ne $newContent) {
                Set-Content $_.FullName -Value $newContent -NoNewline
            }
        }
}

# Fix 1: subscriptions → Subscription (User relation)
Update-InFiles 'subscriptions: \{' 'Subscription: {' 'subscriptions → Subscription'
Update-InFiles '\.subscriptions\.' '.Subscription.' 'subscriptions access'
Update-InFiles '\.subscriptions\?' '.Subscription?' 'subscriptions optional'

# Fix 2: workspace → Workspace (relation in includes)
Update-InFiles 'workspace: \{' 'Workspace: {' 'workspace → Workspace in includes'
Update-InFiles 'workspace: true' 'Workspace: true' 'workspace: true'

# Fix 3: user → User (in WorkspaceMember includes)
Update-InFiles 'WorkspaceMember.*user: \{' 'WorkspaceMember: {\n          User: {' 'user → User in WorkspaceMember'

# Fix 4: project → Project (in where clauses)
Update-InFiles 'project: \{$' 'Project: {' 'project → Project'
Update-InFiles 'project: true' 'Project: true' 'project: true'

# Fix 5: pages → Page
Update-InFiles 'pages: \{' 'Page: {' 'pages → Page'
Update-InFiles 'pages: true' 'Page: true' 'pages: true'
Update-InFiles '\.pages\.' '.Page.' 'pages access'

# Fix 6: members → WorkspaceMember
Update-InFiles 'members: \{$' 'WorkspaceMember: {' 'members → WorkspaceMember'
Update-InFiles '_count\.members' '_count.WorkspaceMember' '_count.members'

# Fix 7: projects → Project (in User)
Update-InFiles 'projects: \{ take' 'Project: { take' 'projects include'
Update-InFiles 'user\.projects' 'user.Project' 'user.projects'
Update-InFiles '_count\.projects' '_count.Project' '_count.projects'

# Fix 8: apiEndpoints → ApiEndpoint
Update-InFiles 'apiEndpoints: \{' 'ApiEndpoint: {' 'apiEndpoints → ApiEndpoint'
Update-InFiles '\.apiEndpoints' '.ApiEndpoint' 'apiEndpoints access'

# Fix 9: environmentVariables → EnvironmentVariable
Update-InFiles 'environmentVariables: \{' 'EnvironmentVariable: {' 'environmentVariables → EnvironmentVariable'
Update-InFiles '\.environmentVariables' '.EnvironmentVariable' 'environmentVariables access'

# Fix 10: Tables → DatabaseTable
Update-InFiles 'Tables: true' 'DatabaseTable: true' 'Tables → DatabaseTable'

# Fix 11: userId → user_id in CustomDomain
Update-InFiles 'userId: session\.user\.id,' 'user_id: session.user.id,' 'userId in CustomDomain (session)'
Update-InFiles 'userId: user\.id,' 'user_id: user.id,' 'userId in CustomDomain (user)'

# Fix 12: newSubscriptions → newSubscription
Update-InFiles '\.newSubscriptions' '.newSubscription' 'newSubscriptions typo'

Write-Host "✅ Automated fixes complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Fix variable naming conflicts (see MANUAL_FIXES.md)"
Write-Host "2. Run: npx tsc --noEmit"