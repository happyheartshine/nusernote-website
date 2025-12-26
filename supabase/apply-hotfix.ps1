#!/usr/bin/env pwsh
# Quick script to apply the signup hotfix migration

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  NurseNote Signup Error Hotfix Installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if ($null -eq $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Or apply the fix manually - see: supabase/HOTFIX_SIGNUP_ERROR.md" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if we're linked to a project
Write-Host "Checking Supabase project link..." -ForegroundColor Yellow
$projectLinked = Test-Path ".supabase/config.toml"

if (-not $projectLinked) {
    Write-Host "⚠️  Not linked to a Supabase project yet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need to link to your project first:" -ForegroundColor White
    Write-Host "  supabase login" -ForegroundColor Cyan
    Write-Host "  supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Do you want to continue with login now? (y/N)"
    
    if ($continue -eq "y" -or $continue -eq "Y") {
        Write-Host "Running: supabase login" -ForegroundColor Cyan
        supabase login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Now link to your project:" -ForegroundColor Yellow
        Write-Host "Your project URL appears to be: https://skqlxkmramgzdqjjqrui.supabase.co" -ForegroundColor White
        Write-Host "So your project ref is: skqlxkmramgzdqjjqrui" -ForegroundColor White
        Write-Host ""
        
        $projectRef = Read-Host "Enter your project ref"
        
        Write-Host "Running: supabase link --project-ref $projectRef" -ForegroundColor Cyan
        supabase link --project-ref $projectRef
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Link failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Successfully linked to project" -ForegroundColor Green
    } else {
        Write-Host "Manual linking required. Exiting." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "✅ Linked to Supabase project" -ForegroundColor Green
Write-Host ""

# Apply the migration
Write-Host "Applying hotfix migration..." -ForegroundColor Yellow
Write-Host "Running: supabase db push" -ForegroundColor Cyan
Write-Host ""

supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try applying manually instead:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://app.supabase.com" -ForegroundColor White
    Write-Host "2. Select your project" -ForegroundColor White
    Write-Host "3. Go to SQL Editor" -ForegroundColor White
    Write-Host "4. Copy contents of: supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql" -ForegroundColor White
    Write-Host "5. Run it" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ✅ Hotfix Applied Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test signup on your application" -ForegroundColor White
Write-Host "2. Verify users can register successfully" -ForegroundColor White
Write-Host "3. Check that new users are in 'pending' status" -ForegroundColor White
Write-Host ""
Write-Host "If you still have issues, check the logs:" -ForegroundColor Yellow
Write-Host "  Dashboard → Logs → Database" -ForegroundColor White
Write-Host ""

