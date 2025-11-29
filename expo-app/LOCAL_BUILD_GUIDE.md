# WebToBook APK - Local Build Guide (Android Studio)

## Why This Works
- No EAS Java version issues
- You control the build environment
- Direct APK generation
- Ready for Google Play Store

## Step-by-Step Instructions

### Step 1: Install Android Studio
1. Download from: https://developer.android.com/studio
2. Install on your computer (Windows, Mac, or Linux)
3. During installation, install Android SDK 33+ and Build Tools

### Step 2: Download Project Files
1. Go to your Replit project
2. Download the `expo-app` folder
3. Extract to your computer

### Step 3: Open in Android Studio
1. Open Android Studio
2. Click "Open an existing Android Studio project"
3. Select the `expo-app` folder
4. Wait for Gradle sync to complete (5-10 minutes)

### Step 4: Build the APK
1. Click **Build** menu → **Build Bundle(s)/APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. APK will be in: `app/release/app-release.apk`

### Step 5: Test on Phone
1. Enable Developer Mode on Android phone
2. Connect phone via USB
3. In Android Studio: **Run** → **Run 'app'**
4. Select your phone and click OK
5. App installs and launches automatically

### Step 6: Upload to Google Play Store
1. Create Google Developer account ($25 one-time fee)
2. Create new app in Play Console
3. Upload `app-release.apk`
4. Fill in app info, screenshots, description
5. Submit for review

## If Build Still Fails in Android Studio
Troubleshooting:
1. Make sure Android SDK 33 is installed
2. Check that Build Tools 33.0.0+ is installed
3. File → Invalidate Caches / Restart
4. Delete `.gradle` folder and rebuild

## App Store Listing Details
```
App Name: WebToBook
Package: com.webtobook.offline
Minimum Android: 5.0 (API 21)
Target Android: 13 (API 33)

Description:
WebToBook - Offline novel converter for Android.
Download novels from web reading sites and convert to text files.
100% offline, no ads, no tracking.

Features:
- Parse novel websites automatically
- Extract chapters with one tap
- Generate text files
- Save to phone storage
- Share with any app
- Works completely offline
- No internet needed after download
```

## Need Help?
If build fails locally:
1. Check Android Studio console for specific error
2. Google the error message
3. Android docs: https://developer.android.com/docs
