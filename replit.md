# WebToBook - Web Novel to EPUB/PDF Converter

## Overview
A powerful web application that converts web novels, books, and online articles to portable book formats (EPUB, PDF, HTML). Features intelligent chapter detection, parallel downloading, and smart format recommendations.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Styling**: Tailwind CSS + Shadcn/UI components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter

### Backend (Express + Node.js)
- **Web Scraping**: Cheerio for fast HTML parsing
- **Content Detection**: Pattern-based chapter recognition
- **File Generation**: 
  - EPUB: Custom archiver-based generator
  - PDF: PDFKit
  - HTML: Template-based generator

## Key Features
1. **URL Analysis** - Paste any book/novel URL to extract chapters
2. **Chapter Selection** - Choose specific chapters to download
3. **Format Selection** - EPUB, PDF, or HTML output with smart recommendations
4. **Parallel Downloads** - Configurable concurrent downloads for speed
5. **Progress Tracking** - Real-time download progress with ETA
6. **Content Cleaning** - Removes ads, navigation, and unwanted elements

## Project Structure
```
client/
  src/
    components/           # UI components
      url-input.tsx       # URL input with validation
      chapter-list.tsx    # Chapter selection list
      format-selector.tsx # Output format selection
      metadata-display.tsx # Book metadata editor
      settings-panel.tsx  # Download settings
      download-progress.tsx # Progress indicator
      download-queue.tsx  # Active/completed downloads
    pages/
      home.tsx            # Main application page
    lib/
      theme-provider.tsx  # Dark/light mode support

server/
  routes.ts              # API endpoints
  storage.ts             # In-memory job storage
  scraper.ts             # Web scraping engine
  generator.ts           # EPUB/PDF/HTML generation

shared/
  schema.ts              # TypeScript types and Zod schemas
```

## API Endpoints
- `POST /api/analyze` - Analyze URL and extract chapters
- `POST /api/download` - Start download job
- `GET /api/jobs` - Get all download jobs
- `GET /api/jobs/:id` - Get specific job status
- `POST /api/jobs/:id/cancel` - Cancel active download
- `POST /api/jobs/clear-completed` - Clear completed/errored jobs
- `GET /api/download-file/:id` - Download generated file

## User Preferences
- Dark mode support via theme toggle
- Configurable concurrent downloads (1-10)
- Request delay settings (0-2000ms)
- Retry attempts configuration
- Include/exclude images option
- HTML cleanup toggle

## Recent Changes
- Initial implementation of web-to-EPUB converter
- Added support for 500+ reading sites
- Implemented EPUB, PDF, and HTML generation
- Added dark/light theme support
- Created responsive UI with progress tracking
