# WebToBook Offline APK - Build Instructions

## What This App Does
- ✅ Runs 100% offline on your phone (no internet needed after download)
- ✅ Scrapes novels from websites using your phone's browser
- ✅ Extracts chapters automatically
- ✅ Generates proper EPUB files
- ✅ Saves files to your phone storage
- ✅ Share files via any app

## Build Command
```bash
eas build --platform android
```

## Build Time
- First time: 10-15 minutes
- Subsequent builds: 5-10 minutes

## APK Features
1. **URL Input** - Paste any novel website URL
2. **Auto-Detection** - Finds chapters automatically
3. **Select Chapters** - Choose which chapters to include
4. **EPUB Generation** - Creates standard EPUB files
5. **File Sharing** - Share via email, cloud storage, etc.

## Tested Sites
- WuxiaSpot
- WebNovel
- Standard blog/wordpress sites
- Most HTML-based novel sites

## Privacy
- All processing happens ON your device
- No data sent to servers
- No ads or tracking
- Completely open source

## Installation
1. Run `eas build --platform android`
2. Download the APK when ready
3. Enable "Unknown Sources" on your phone
4. Install the APK
5. Open and start converting novels!

