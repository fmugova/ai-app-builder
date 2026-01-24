# Find Duplicate Code Blocks
# PowerShell script to identify files with duplicate code

Write-Host "Scanning for duplicate code blocks..." -ForegroundColor Cyan

$duplicateFiles = @()

# Common patterns that indicate duplicate code
$patterns = @(
    'try \{.*?try \{',  # Nested try blocks (usually duplicate)
    'export async function.*?export async function',  # Duplicate function exports
    'const session = await getServerSession.*?const session = await getServerSession'  # Duplicate auth checks
)

Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse -File | 
    Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        $hasDuplicate = $false
        
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                $hasDuplicate = $true
                break
            }
        }
        
        if ($hasDuplicate) {
            $duplicateFiles += $_.FullName
            Write-Host "Found duplicate code in: $($_.FullName)" -ForegroundColor Red
        }
    }

Write-Host ""
if ($duplicateFiles.Count -eq 0) {
    Write-Host "No duplicate code blocks found!" -ForegroundColor Green
} else {
    Write-Host "Found $($duplicateFiles.Count) files with duplicate code:" -ForegroundColor Yellow
    $duplicateFiles | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    Write-Host "Review these files and remove duplicate code blocks." -ForegroundColor Yellow
}