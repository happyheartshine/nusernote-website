#!/bin/bash
# Quick setup script for IPAexGothic font installation
# Usage: ./setup_fonts.sh

set -e

echo "============================================"
echo "  IPAexGothic Font Installation Script"
echo "============================================"
echo ""

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FONTS_DIR="$SCRIPT_DIR"

echo "📁 Target directory: $FONTS_DIR"
echo ""

# Check if font already exists
if [ -f "$FONTS_DIR/IPAexGothic.ttf" ]; then
    SIZE=$(ls -lh "$FONTS_DIR/IPAexGothic.ttf" | awk '{print $5}')
    echo "ℹ️  Font already exists (Size: $SIZE)"
    read -p "Do you want to re-download? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Using existing font file."
        exit 0
    fi
    echo "🔄 Re-downloading font..."
fi

# Download font
echo "📥 Downloading IPAexGothic font from GitHub mirror..."
echo ""

FONT_URL="https://github.com/jonaskohl/ipafont-mirror/raw/master/IPAexGothic.ttf"

if command -v wget &> /dev/null; then
    wget -q --show-progress "$FONT_URL" -O "$FONTS_DIR/IPAexGothic.ttf"
elif command -v curl &> /dev/null; then
    curl -L "$FONT_URL" -o "$FONTS_DIR/IPAexGothic.ttf" --progress-bar
else
    echo "❌ Error: Neither wget nor curl is available."
    echo "Please install wget or curl, or download the font manually."
    exit 1
fi

# Verify download
echo ""
echo "✅ Verifying download..."

if [ -f "$FONTS_DIR/IPAexGothic.ttf" ]; then
    SIZE=$(ls -lh "$FONTS_DIR/IPAexGothic.ttf" | awk '{print $5}')
    BYTES=$(ls -l "$FONTS_DIR/IPAexGothic.ttf" | awk '{print $5}')
    
    # Check if file size is reasonable (should be around 5-6 MB)
    if [ "$BYTES" -lt 4000000 ]; then
        echo "⚠️  Warning: File size seems too small ($SIZE). Download may have failed."
        exit 1
    fi
    
    echo "✅ Font installed successfully!"
    echo "📊 File size: $SIZE"
    echo "📍 Location: $FONTS_DIR/IPAexGothic.ttf"
    echo ""
    echo "🎉 Japanese PDF generation is now ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your FastAPI server"
    echo "  2. Generate a test PDF"
    echo "  3. Verify Japanese text displays correctly (not as ■■■)"
    echo ""
else
    echo "❌ Font download failed."
    echo "Please download manually from:"
    echo "  https://moji.or.jp/ipafont/"
    echo "Or:"
    echo "  $FONT_URL"
    exit 1
fi

