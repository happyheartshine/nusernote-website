# WeasyPrint Windows Installation Fix

## ⚠️ Issue

```
OSError: cannot load library 'libgobject-2.0-0'
```

This error occurs because WeasyPrint requires GTK3 runtime libraries on Windows.

---

## ✅ Solution: Install GTK3 Runtime

### Step 1: Run the Installer

The GTK3 installer has been downloaded to your temp folder. 

**Follow these steps:**

1. ✅ The installer should have opened automatically
2. ⚠️ **IMPORTANT**: During installation, check the box for **"Set up PATH environment variable"**
3. Click through the installer (default options are fine)
4. Complete the installation

### Step 2: Restart Terminal

After GTK3 installation completes:

```powershell
# Close this terminal window completely
# Open a NEW terminal window
# Then navigate back to your project
cd "C:\Work\nurseNote AI\backend"
```

### Step 3: Verify Installation

```powershell
# Check if GTK libraries are in PATH
$env:PATH -split ';' | Select-String -Pattern 'gtk'
```

You should see a path like: `C:\Program Files\GTK3-Runtime Win64\bin`

### Step 4: Restart FastAPI Server

```powershell
cd "C:\Work\nurseNote AI\backend"
uvicorn main:app --reload
```

---

## 🔍 If Installer Didn't Open

Run manually:

```powershell
$installer = "$env:TEMP\gtk3-runtime-installer.exe"
Start-Process $installer
```

Or download directly from:
https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases

---

## 🐛 Troubleshooting

### Issue: GTK installed but still getting error

**Solution 1: Add GTK to PATH manually**

1. Search Windows for "Environment Variables"
2. Edit "System Environment Variables"
3. Add to PATH: `C:\Program Files\GTK3-Runtime Win64\bin`
4. Restart terminal completely

**Solution 2: Verify GTK DLLs**

```powershell
Test-Path "C:\Program Files\GTK3-Runtime Win64\bin\libgobject-2.0-0.dll"
```

Should return: `True`

**Solution 3: Reinstall in new terminal**

```powershell
# Close ALL terminal windows
# Open NEW PowerShell as Administrator
cd "C:\Work\nurseNote AI\backend"
pip uninstall weasyprint
pip install weasyprint
uvicorn main:app --reload
```

---

## 📋 Alternative: Use Docker (if GTK issues persist)

If GTK installation continues to cause issues, use Docker where WeasyPrint works perfectly:

```dockerfile
FROM python:3.11-slim

# Install WeasyPrint dependencies (works perfectly on Linux)
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## ✅ Success Indicators

After successful installation, you should see:

```
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

No WeasyPrint import errors!

---

## 📞 Next Steps

1. ✅ Install GTK3 (installer should be running now)
2. ⚠️ Check "Set up PATH" during installation
3. 🔄 Restart terminal completely
4. 🚀 Start FastAPI server
5. 🎉 Generate PDF and verify Japanese text works!

---

**Current Status**: Waiting for GTK3 installation to complete

