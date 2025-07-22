#!/bin/bash

# PNG to ICO converter for Windows executable
# Requires ImageMagick

if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Install it with: brew install imagemagick"
    else
        echo "Install it with: sudo apt-get install imagemagick"
    fi
    exit 1
fi

if [ ! -f "assets/icon.png" ]; then
    echo "Error: assets/icon.png not found!"
    exit 1
fi

echo "Converting PNG to ICO..."

# Create multiple sizes for ICO
convert assets/icon.png -resize 16x16 assets/icon-16.png
convert assets/icon.png -resize 32x32 assets/icon-32.png
convert assets/icon.png -resize 48x48 assets/icon-48.png
convert assets/icon.png -resize 64x64 assets/icon-64.png
convert assets/icon.png -resize 128x128 assets/icon-128.png
convert assets/icon.png -resize 256x256 assets/icon-256.png

# Combine into ICO
convert assets/icon-16.png assets/icon-32.png assets/icon-48.png assets/icon-64.png assets/icon-128.png assets/icon-256.png assets/icon.ico

# Clean up temporary files
rm -f assets/icon-*.png

echo "✅ Icon converted to assets/icon.ico"