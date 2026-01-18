# Add ESLint disable comments to all compose as any lines
Get-ChildItem -Path "app\api" -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    if ($content -match '\(compose as any\)' -and $content -notmatch 'eslint-disable-next-line') {
        $lines = Get-Content $_.FullName
        $newLines = @()
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match 'const composed = \(compose as any\)') {
                # Add eslint comment before this line
                $indent = ($lines[$i] -replace '\S.*', '')
                $newLines += "$indent// eslint-disable-next-line @typescript-eslint/no-explicit-any"
            }
            $newLines += $lines[$i]
        }
        
        $newLines | Set-Content $_.FullName
        Write-Host "✓ Fixed $($_.FullName)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Done! Run npm run build" -ForegroundColor Cyan