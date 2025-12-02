# Changelog

## [Unreleased]

### New Features & Performance Improvements (2025-12-02)

#### Added

- **🖼️ Image Manager** - Unified image management for Markdown documents
  - Automatically extracts all image references from current document
  - Grid layout with thumbnails for easy browsing
  - Distinguishes between local (📁) and remote (🌐) images
  - Shows image name (alt text), line number, and type
  - Hover effect for better interaction
  - Click toolbar "🖼️ Images" button to open
  - **🗜️ Image Compression** - Compress local images with one click
    - Three quality presets: Low (0.5MB), Medium (1MB), High (2MB)
    - Real-time progress bar during compression
    - Shows compression ratio and size comparison
    - Replaces original file with compressed version
    - Uses browser-image-compression library with Web Worker
- **📊 Visual Table Editor** - Excel-style table editing experience
  - Place cursor in Markdown table and click "📊 Table" button
  - Visual cell editing with input fields
  - Add/delete rows and columns with one click
  - Automatic table formatting and alignment
  - Supports left/center/right alignment (`:---`, `:---:`, `---:`)
  - No more manual pipe character alignment needed!
- **⌨️ Keyboard Shortcuts Help** - Quick reference for all shortcuts
  - Click "⌨️ Shortcuts" button in toolbar
  - Organized by category (File, Tabs, Search, View, Editor, Formatting)
  - Beautiful UI with kbd-style key display
  - Bilingual support (Chinese/English)
  - Includes helpful tip at bottom

#### Performance

- **⚡ Debounce Optimization** - Improved responsiveness
  - Auto-save delay reduced from 3000ms to 2000ms
  - Preview update debounce set to 300ms
  - Centralized performance constants for easy tuning
- **📁 Large File Detection** - Smart file size warnings
  - 5MB-10MB files: Console warning
  - > 10MB files: Confirmation dialog before opening
  - Prevents performance issues with very large files
  - Graceful error handling if detection fails

### UI/UX Improvements (2025-12-01)

#### Changed

- **AI Provider Configuration Simplified** - Reduced from 11 options to 3 core options
  - Consolidated OpenAI-compatible providers (DeepSeek, Kimi, Qwen, etc.) into single "OpenAI (兼容 API)" option
  - Retained Claude and Ollama as separate options
  - Added inline usage instructions with examples for different providers
  - Removed ~60 lines of redundant provider configuration code

- **TabBar Component Integration** - Replaced 67 lines of inline tab rendering with reusable TabBar component
  - Improved code organization and maintainability
  - Simplified click-to-switch functionality
  - Removed drag-and-drop feature due to Tauri webview limitations

#### Removed

- Individual provider options: DeepSeek, Kimi, OpenRouter, Gemini, Azure OpenAI, Qwen, Baidu, ChatGLM
- Drag-and-drop tab reordering (Tauri webview compatibility issue)

#### Added

- **Keyboard Shortcuts** - Global keyboard shortcuts for tab management
  - `Ctrl+Tab` - Switch to next tab (with circular navigation)
  - `Ctrl+Shift+Tab` - Switch to previous tab (reverse circular navigation)
  - `Ctrl+W` - Close current tab
- **AI Configuration Enhancements**
  - "Test Connection" button next to API Key input for quick validation
  - Collapsible configuration templates panel with 5 popular providers (DeepSeek, Kimi, Qwen, Ollama, OpenRouter)
  - Detailed API Base URL and model examples for each provider

- **TabBar UX Improvements**
  - Long filename truncation with ellipsis (max 200px) and tooltip on hover
  - Tab max-width constraint (250px) to prevent layout overflow
  - Tab height increased to 32px+ for better clickability
  - Enhanced close button (20x20px with hover background)
  - Batch operations in right-click menu: "Close All Tabs" option added

- **Responsive UI Implementation** ⭐ NEW
  - Mobile view (< 768px): Single-column layout with editor/preview switcher
  - Sidebar drawer with overlay for mobile devices
  - Large icon buttons for mobile (✏️ Editor / 👁️ Preview)
  - Tablet view (768px-1024px): Compact dual-pane layout
  - Dynamic CSS Grid breakpoints

- **UI/UX Visual Improvements** ⭐ NEW
- Button Hierarchy: Primary (blue), Secondary (default), Danger (red) styles
- Hover animations with smooth transitions (transform + border color)
- Sidebar tab-style switcher with bottom border indicator
- All buttons have improved hover feedback with lift effect

- **AI Chat Modal Improvements**
  - Simplified UI: removed redundant Base URL/Model inputs
  - Auto-sync with global settings (no duplicate configuration needed)
  - Fixed 401 error caused by Base URL being reset to default
  - Read-only display of current provider and model name

- **Testing**
  - Unit tests for TabBar component (7 tests, 100% pass rate)
  - Test coverage: rendering, clicking, closing, context menu, event propagation

#### Fixed

- TypeScript error: `info.__children` potentially undefined in file tree rendering
- AI Chat 401 authorization error (removed automatic Base URL reset logic)

### Major Refactoring - Hooks-based Architecture (2025-11-30)

#### Added

- **useEditorState** - Centralized editor and UI state management (240 lines, 18 tests)
- **useFileManager** - Unified file operations and tab management (380 lines, 5 tests)
- **useSettingsManager** - Application settings persistence layer (282 lines, 3 tests)
- **usePreviewManager** - Markdown rendering and Mermaid chart processing (121 lines, 7 tests)
- **Unit Tests** - Added comprehensive tests for hooks (33 tests passing, 100% pass rate)
- **Architecture Documentation** - Created detailed architecture guides (EN/ZH)
- **Contributing Guide** - Added developer setup and contribution guidelines
- **Test Coverage Report** - Documented current test coverage
- **Project Summary** - Comprehensive project completion report
- **Prettier Configuration** - Code formatting setup for consistency
- **NPM Scripts** - Added format, format:check, and type-check scripts

#### Changed

- Refactored `App.tsx` from 2600+ lines to ~2000 lines (~600 lines reduced, 23% improvement)
- Extracted preview rendering logic to `usePreviewManager`
- Integrated existing `useAI` and `useAIState` hooks
- Improved code organization and maintainability
- Enhanced type safety across all hooks
- Formatted 44 files with Prettier for consistent code style

#### Fixed

- Resolved all TypeScript compilation errors (zero errors achieved)
- Fixed timer type issues in `App.tsx` using `ReturnType<typeof setInterval>`
- Corrected component import paths (PascalCase)
- Fixed `verbatimModuleSyntax` errors in hook imports

#### Performance

- Mermaid diagram caching for faster re-renders
- Memory limit management for untitled documents
- Optimized scroll synchronization
- Improved code splitting through modular hooks

#### Documentation

- Created `docs/ARCHITECTURE.md` and `.zh-CN.md`
- Created `docs/CONTRIBUTING.md` and `.zh-CN.md`
- Created `docs/TEST_COVERAGE.md`
- Created `docs/PROJECT_SUMMARY.md`
- Updated `README.md` and `README.zh-CN.md`
- Deleted 18 obsolete documentation files

#### Testing

- Set up Vitest testing framework
- Added @testing-library/react for component testing
- Created comprehensive test suites for 4 core hooks
- Achieved 60-85% estimated coverage on tested hooks
- All 33 tests passing

### Previous Versions

See commit history for earlier changes.
