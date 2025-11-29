#!/bin/bash

echo "========================================"
echo "WebToBook APK Builder"
echo "========================================"
echo ""
echo "Building for Android with compatibility mode..."
echo ""

# Use production profile which works better
eas build --platform android --profile production --wait

echo ""
echo "Build initiated! Check EAS dashboard for status."
