# Quick setup script for IPAexGothic font installation (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File setup_fonts.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IPAexGothic Font Installation Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FontPath = Join-Path $ScriptDir "IPAexGothic.ttf"

Write-Host "📁 Target directory: $ScriptDir" -ForegroundColor Yellow
Write-Host ""

# Check if font already exists
if (Test-Path $FontPath) {
    $FileSize = (Get-Item $FontPath).Length / 1MB
    Write-Host "ℹ️  Font already exists (Size: $($FileSize.ToString('F2')) MB)" -ForegroundColor Yellow
    $Response = Read-Host "Do you want to re-download? (y/N)"
    if ($Response -notmatch '^[Yy]$') {
        Write-Host "✅ Using existing font file." -ForegroundColor Green
        exit 0
    }
    Write-Host "🔄 Re-downloading font..." -ForegroundColor Yellow
}

# Download font
Write-Host "📥 Downloading IPAexGothic font from GitHub mirror..." -ForegroundColor Cyan
Write-Host ""

$FontUrl = "https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf"

try {
    Invoke-WebRequest -Uri $FontUrl -OutFile $FontPath -ErrorAction Stop
    
    # Verify download
    Write-Host ""
    Write-Host "✅ Verifying download..." -ForegroundColor Cyan
    
    if (Test-Path $FontPath) {
        $FileSize = (Get-Item $FontPath).Length / 1MB
        $FileBytes = (Get-Item $FontPath).Length
        
        # Check if file size is reasonable (should be around 5-6 MB)
        if ($FileBytes -lt 4000000) {
            Write-Host "⚠️  Warning: File size seems too small ($($FileSize.ToString('F2')) MB). Download may have failed." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Font installed successfully!" -ForegroundColor Green
        Write-Host "📊 File size: $($FileSize.ToString('F2')) MB" -ForegroundColor Green
        Write-Host "📍 Location: $FontPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Japanese PDF generation is now ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Restart your FastAPI server" -ForegroundColor White
        Write-Host "  2. Generate a test PDF" -ForegroundColor White
        Write-Host "  3. Verify Japanese text displays correctly (not as ■■■)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Font download failed." -ForegroundColor Red
        Write-Host "Please download manually from:" -ForegroundColor Yellow
        Write-Host "  https://moji.or.jp/ipafont/" -ForegroundColor White
        Write-Host "Or:" -ForegroundColor Yellow
        Write-Host "  $FontUrl" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ Error downloading font: $_" -ForegroundColor Red
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "  https://moji.or.jp/ipafont/" -ForegroundColor White
    Write-Host "Or:" -ForegroundColor Yellow
    Write-Host "  $FontUrl" -ForegroundColor White
    exit 1
}

