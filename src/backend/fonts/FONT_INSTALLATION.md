# Japanese Font Installation Guide for PDF Generation

## ⚠️ CRITICAL: Japanese Font Required

Without the Japanese font, **ALL Japanese text will appear as boxes (■■■)** in generated PDFs.

This guide explains how to install IPAexGothic font for proper Japanese text rendering.

---

## 📋 Overview

- **Font Required**: IPAexGothic.ttf
- **Purpose**: Embed Japanese characters in medical PDF documents
- **License**: IPA Font License (free for commercial use)
- **File Location**: `/app/fonts/IPAexGothic.ttf` (or `backend/fonts/IPAexGothic.ttf`)

---

## 🔽 Download IPAexGothic Font

### Option 1: Direct Download (Recommended)

1. Visit the official IPA Font website:
   ```
   https://moji.or.jp/ipafont/ipafontdownload/
   ```

2. Download **IPAexフォント** (IPAex Font)
   - File: `IPAexfont00401.zip`

3. Extract the ZIP file

4. Locate `IPAexGothic.ttf` in the extracted folder

### Option 2: Alternative Mirror

If the official site is down, use this direct link:
```
https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf
```

### Option 3: Using wget (Linux/Mac)

```bash
cd backend/fonts/
wget https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf
```

### Option 4: Using PowerShell (Windows)

```powershell
cd backend\fonts\
Invoke-WebRequest -Uri "https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf" -OutFile "IPAexGothic.ttf"
```

---

## 📁 Installation Steps

### For Local Development

1. **Copy the font file** to the fonts directory:

   **Windows:**
   ```powershell
   copy path\to\downloaded\IPAexGothic.ttf backend\fonts\IPAexGothic.ttf
   ```

   **Linux/Mac:**
   ```bash
   cp path/to/downloaded/IPAexGothic.ttf backend/fonts/IPAexGothic.ttf
   ```

2. **Verify the file exists:**

   **Windows:**
   ```powershell
   dir backend\fonts\IPAexGothic.ttf
   ```

   **Linux/Mac:**
   ```bash
   ls -lh backend/fonts/IPAexGothic.ttf
   ```

   Expected file size: ~5-6 MB

3. **Restart your FastAPI server** to reload the PDF generation service

### For Docker Environment

1. **Add font to the fonts directory** (same as above)

2. **Update your Dockerfile** (if not already configured):

   ```dockerfile
   # Install WeasyPrint system dependencies
   RUN apt-get update && apt-get install -y \
       libpango-1.0-0 \
       libpangoft2-1.0-0 \
       libharfbuzz0b \
       libffi-dev \
       libjpeg-dev \
       libopenjp2-7-dev \
       && rm -rf /var/lib/apt/lists/*

   # Copy fonts directory
   COPY backend/fonts /app/fonts
   
   # Verify font was copied
   RUN ls -lh /app/fonts/IPAexGothic.ttf
   ```

3. **Rebuild the Docker image:**
   ```bash
   docker build -t nursenote-backend .
   ```

4. **Run the container:**
   ```bash
   docker run -p 8000:8000 nursenote-backend
   ```

### For Production Server

1. **Upload the font file** to your production server:

   ```bash
   scp IPAexGothic.ttf user@server:/path/to/app/backend/fonts/
   ```

2. **Or download directly on the server:**

   ```bash
   cd /path/to/app/backend/fonts/
   wget https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf
   ```

3. **Set proper permissions:**

   ```bash
   chmod 644 /path/to/app/backend/fonts/IPAexGothic.ttf
   ```

4. **Restart your FastAPI application**

---

## ✅ Verification

### 1. Check Font File

```bash
# Linux/Mac
ls -lh backend/fonts/IPAexGothic.ttf

# Windows PowerShell
Get-Item backend\fonts\IPAexGothic.ttf
```

Expected output: File size ~5-6 MB

### 2. Check Backend Logs

When generating a PDF, look for this log message:

```
INFO: Japanese font verified at: /app/fonts/IPAexGothic.ttf
INFO: Converting HTML to PDF using WeasyPrint with Japanese font embedding
INFO: Successfully generated visit report PDF (XXXXX bytes)
```

⚠️ **Warning message if font is missing:**
```
WARNING: Japanese font not found at: /app/fonts/IPAexGothic.ttf
WARNING: Japanese text will render as boxes (■■■) in the PDF.
WARNING: Please download IPAexGothic.ttf and place it in the fonts directory.
```

### 3. Test PDF Generation

1. Generate a test PDF through the API
2. Open the PDF in Adobe Acrobat or Preview
3. Check that Japanese text (利用者氏名, 訪問年月日, etc.) displays correctly
4. **NOT** as boxes: ■■■■■

---

## 🔧 Troubleshooting

### Issue: Font file exists but Japanese text still shows as boxes

**Solution 1: Check file path**
- Ensure the font file is at the **exact** path: `backend/fonts/IPAexGothic.ttf`
- Path is case-sensitive on Linux/Mac

**Solution 2: Check file permissions (Linux/Mac)**
```bash
chmod 644 backend/fonts/IPAexGothic.ttf
```

**Solution 3: Restart FastAPI server**
```bash
# Kill existing process
pkill -f uvicorn

# Restart
uvicorn backend.main:app --reload
```

**Solution 4: Check WeasyPrint installation**
```bash
pip install --upgrade weasyprint>=60.0
```

### Issue: WeasyPrint import error

**Solution: Install system dependencies**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi-dev libjpeg-dev libopenjp2-7-dev
```

**macOS:**
```bash
brew install pango harfbuzz
```

**Windows:**
1. Download GTK3 runtime from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
2. Run the installer
3. ⚠️ **IMPORTANT**: Check "Set up PATH environment variable" during installation
4. Restart terminal completely after installation
5. Run: `pip install --upgrade weasyprint`

**Or use PowerShell to download:**
```powershell
$url = "https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases/download/2022-01-04/gtk3-runtime-3.24.31-2022-01-04-ts-win64.exe"
$output = "$env:TEMP\gtk3-runtime-installer.exe"
Invoke-WebRequest -Uri $url -OutFile $output
Start-Process $output
```

See `backend/WINDOWS_SETUP.md` for detailed Windows troubleshooting.

### Issue: PDF generation fails with font error

**Check CSS file:**
```bash
cat backend/templates/pdf.css | grep "@font-face"
```

Expected output should include:
```css
@font-face {
    font-family: 'IPAexGothic';
    src: url('file:///app/fonts/IPAexGothic.ttf') format('truetype');
}
```

---

## 📝 Font License Information

**IPA Font License Agreement v1.0**

- ✅ Free for commercial use
- ✅ Redistribution allowed
- ✅ Modification allowed
- ℹ️ License text must be included when redistributing

Full license: https://opensource.org/licenses/IPA

**For this project:**
- Font is NOT included in git repository (too large)
- Each deployment must download the font separately
- No license violation as font is not redistributed with code

---

## 🚀 Quick Setup Script

Save this as `setup_fonts.sh` (Linux/Mac) or `setup_fonts.ps1` (Windows):

**Linux/Mac (setup_fonts.sh):**
```bash
#!/bin/bash
set -e

echo "📥 Downloading IPAexGothic font..."
cd backend/fonts/
wget -q --show-progress https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf

echo "✅ Verifying download..."
if [ -f "IPAexGothic.ttf" ]; then
    SIZE=$(ls -lh IPAexGothic.ttf | awk '{print $5}')
    echo "✅ Font installed successfully! Size: $SIZE"
    echo "🎉 Japanese PDF generation is now ready!"
else
    echo "❌ Font download failed. Please download manually."
    exit 1
fi
```

Run: `chmod +x setup_fonts.sh && ./setup_fonts.sh`

**Windows (setup_fonts.ps1):**
```powershell
Write-Host "📥 Downloading IPAexGothic font..." -ForegroundColor Cyan
Set-Location backend\fonts\
Invoke-WebRequest -Uri "https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf" -OutFile "IPAexGothic.ttf"

Write-Host "✅ Verifying download..." -ForegroundColor Cyan
if (Test-Path "IPAexGothic.ttf") {
    $size = (Get-Item "IPAexGothic.ttf").Length / 1MB
    Write-Host "✅ Font installed successfully! Size: $($size.ToString('F2')) MB" -ForegroundColor Green
    Write-Host "🎉 Japanese PDF generation is now ready!" -ForegroundColor Green
} else {
    Write-Host "❌ Font download failed. Please download manually." -ForegroundColor Red
    exit 1
}
```

Run: `powershell -ExecutionPolicy Bypass -File setup_fonts.ps1`

---

## 📚 Additional Resources

- **IPA Font Official Site**: https://moji.or.jp/ipafont/
- **WeasyPrint Documentation**: https://doc.courtbouillon.org/weasyprint/
- **Font License**: https://opensource.org/licenses/IPA

---

## ✉️ Support

If you continue to have issues after following this guide:

1. Check backend logs for specific error messages
2. Verify WeasyPrint is properly installed: `pip show weasyprint`
3. Ensure all system dependencies are installed
4. Try generating a simple test PDF first

---

**Last Updated**: December 2025
**Compatible With**: WeasyPrint 60.0+, FastAPI 0.104.0+

