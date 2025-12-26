#!/bin/bash
# Quick script to apply the signup hotfix migration

echo ""
echo "=================================================="
echo "  NurseNote Signup Error Hotfix Installer"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
echo -e "${YELLOW}Checking for Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please install it first:${NC}"
    echo -e "${NC}  npm install -g supabase${NC}"
    echo ""
    echo -e "${YELLOW}Or apply the fix manually - see: supabase/HOTFIX_SIGNUP_ERROR.md${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if we're linked to a project
echo -e "${YELLOW}Checking Supabase project link...${NC}"
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Not linked to a Supabase project yet${NC}"
    echo ""
    echo -e "${NC}You need to link to your project first:${NC}"
    echo -e "${CYAN}  supabase login${NC}"
    echo -e "${CYAN}  supabase link --project-ref YOUR_PROJECT_REF${NC}"
    echo ""
    read -p "Do you want to continue with login now? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Running: supabase login${NC}"
        supabase login
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Login failed${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${YELLOW}Now link to your project:${NC}"
        echo -e "${NC}Your project URL appears to be: https://skqlxkmramgzdqjjqrui.supabase.co${NC}"
        echo -e "${NC}So your project ref is: skqlxkmramgzdqjjqrui${NC}"
        echo ""
        
        read -p "Enter your project ref: " projectRef
        
        echo -e "${CYAN}Running: supabase link --project-ref $projectRef${NC}"
        supabase link --project-ref "$projectRef"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Link failed${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Successfully linked to project${NC}"
    else
        echo -e "${YELLOW}Manual linking required. Exiting.${NC}"
        exit 0
    fi
fi

echo -e "${GREEN}✅ Linked to Supabase project${NC}"
echo ""

# Apply the migration
echo -e "${YELLOW}Applying hotfix migration...${NC}"
echo -e "${CYAN}Running: supabase db push${NC}"
echo ""

supabase db push

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo -e "${YELLOW}Try applying manually instead:${NC}"
    echo -e "${NC}1. Go to: https://app.supabase.com${NC}"
    echo -e "${NC}2. Select your project${NC}"
    echo -e "${NC}3. Go to SQL Editor${NC}"
    echo -e "${NC}4. Copy contents of: supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql${NC}"
    echo -e "${NC}5. Run it${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✅ Hotfix Applied Successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "${NC}1. Test signup on your application${NC}"
echo -e "${NC}2. Verify users can register successfully${NC}"
echo -e "${NC}3. Check that new users are in 'pending' status${NC}"
echo ""
echo -e "${YELLOW}If you still have issues, check the logs:${NC}"
echo -e "${NC}  Dashboard → Logs → Database${NC}"
echo ""

