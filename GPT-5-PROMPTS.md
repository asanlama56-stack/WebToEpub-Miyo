# GPT-5 Prompts for WebToBook Enhancement

## Prompt 1: Implementing Local Download Functionality (No External Redirects)

**Goal**: Implement a completely local download mechanism that avoids any external redirects or new tabs.

**Prompt for GPT-5**:

```
I have a web-to-EPUB/PDF converter application that generates book files locally on the server. 
Currently, the download mechanism opens a new tab/window which users find inconvenient, especially on mobile devices.

Requirements:
1. Downloads must happen entirely within the current application window (no new tabs/windows)
2. Users should see a visual indication when download completes (toast/notification)
3. The file should automatically save to their default downloads folder
4. Mobile phone compatibility is critical - must work on iOS and Android browsers
5. No external redirects or service calls
6. Progress indication during download would be beneficial

Current backend endpoint: GET /api/download-file/:id returns the file buffer with proper headers

Technical constraints:
- React + TypeScript frontend
- Express backend
- EPUB, PDF, and HTML output formats

Please provide:
1. Complete solution for local download using modern Fetch API and Blob handling
2. Mobile-optimized approach (including iOS Safari compatibility)
3. Error handling and user feedback
4. Optional progress tracking during download
5. Code example showing implementation in React hook
```

---

## Prompt 2: Optimizing Download Algorithm for Faster EPUB Generation

**Goal**: Optimize the EPUB generation and chapter download process for maximum performance.

**Prompt for GPT-5**:

```
I'm optimizing an EPUB generation system that processes novels with hundreds to thousands of chapters. 
The current implementation works but is slower than ideal, especially on mobile devices with limited bandwidth.

Current architecture:
- Backend: Node.js + Express with archiver library for EPUB packaging
- Parallel downloads: 3 concurrent downloads by default (configurable 1-10)
- EPUB generation: Uses custom archiver-based approach with manual XML creation
- Chapter processing: DOM cleaning with cheerio + sanitize-html
- Constraint: Maximum 2000 chapters per download to ensure mobile stability

Areas to optimize:
1. EPUB generation speed - currently generates content.opf, nav.xhtml, and chapter files sequentially
2. Chapter content processing - HTML cleaning and validation could be faster
3. Image embedding - currently converts to base64 data URLs (resource intensive)
4. Parallel download bottlenecks - explore if 3 concurrent is truly optimal
5. Memory efficiency - large files consume significant RAM during generation
6. Archive creation - current archiver approach may not be optimally configured

Please provide:
1. Algorithm optimizations for EPUB generation (parallel chapter processing, streaming where possible)
2. Image handling improvements (lazy loading, compression, selective embedding)
3. Chapter content processing optimization (caching strategies, batch operations)
4. Configuration recommendations for parallel downloads (ideal concurrency levels)
5. Memory optimization techniques for large downloads
6. Performance benchmarking recommendations
7. Code examples for critical optimization points
8. Estimated performance improvements (% faster, time savings for typical 500-chapter book)
```

---

## How to Use These Prompts

1. **For Local Downloads**: Use Prompt 1 to get detailed implementation guidance. The response will include mobile-optimized code using Fetch API and Blob handling, perfect for your use case.

2. **For EPUB Optimization**: Use Prompt 2 to receive algorithm improvements and performance best practices. Focus on the parallel processing, memory optimization, and image handling recommendations.

3. **Implementation Priority**:
   - First: Implement local downloads (Prompt 1) for immediate user experience improvement
   - Second: Apply EPUB optimizations (Prompt 2) for performance gains

4. **Follow-up Questions**: After receiving the initial responses, you can ask for:
   - Specific code implementation details
   - Performance testing methods
   - Compatibility testing approaches
   - Mobile-specific edge case handling

---

## Current Status (As of Nov 29, 2025)

✅ **Already Implemented**:
- Image validation pipeline with separate background worker
- Parallel chapter downloading (configurable 1-10 concurrent)
- Multiple output formats (EPUB, PDF, HTML)
- 2000-chapter mobile safety limit
- Dark/light theme support

❌ **Not Yet Implemented** (Use GPT-5 prompts above):
- True local downloads without window.open redirects
- EPUB generation performance optimization
- Selective image embedding strategies
- Advanced memory management for large downloads

---

## Notes

- These prompts are designed for Claude's upcoming GPT-5 or equivalent advanced LLM models
- The prompts provide enough context for the AI to understand your full architecture
- Feel free to customize the prompts based on your specific priorities
- Share the responses with your development team for collaborative implementation planning
