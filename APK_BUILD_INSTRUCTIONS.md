# WebToBook APK Build Instructions

## Step 1: Update App URL
Edit `App.js` and replace:
```
const WEB_APP_URL = 'https://your-app.replit.dev';
```
with your actual Replit app URL (copy from your Replit project URL bar)

## Step 2: Build APK
Run in terminal:
```bash
eas build --platform android
```

The build will:
1. Create a native Android app
2. Include your WebToBook web app
3. Generate an APK file (~5-15 minutes)
4. Provide a download link

## Step 3: Install on Phone
Once the APK is ready, download it and install on your Android phone.

## Features
- Access full WebToBook app from your phone
- Download and convert web novels
- All features work as in the web version
- No browser needed - native app experience

---
For questions or issues, refer to EAS documentation: https://docs.expo.dev/eas/
