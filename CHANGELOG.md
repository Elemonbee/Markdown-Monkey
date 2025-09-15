# Changelog

All notable changes to MarkdownMonkey will be documented in this file.

## [0.1.1] - 2025-09-15

### 🎉 New Features
- **Auto-save Indicator**: Real-time display of document save status in the status bar with color-coded indicators (green/orange/red). Documents are automatically saved 3 seconds after editing.
- **Command Palette** (Ctrl+Shift+P): Quick access to all features with search filtering and keyboard navigation support.
- **Focus Mode** (F11): Immersive writing experience that hides all UI elements except the editor, with larger font size and line height for better readability.
- **Mermaid Diagram Support**: Automatic rendering of various diagram types including flowcharts, sequence diagrams, Gantt charts, and pie charts. Diagrams adapt to light/dark themes.

### 🐛 Bug Fixes
- **Fixed Word Count Statistics**: Improved accuracy of word count for mixed Chinese-English content. Now correctly counts English words and CJK characters separately.
- **Fixed Scrollbar Issues**: Resolved problems with both horizontal and vertical scrollbars not appearing correctly in the CodeMirror editor, especially when opening existing documents. Scrollbars now display properly based on content overflow.

### 📝 Improvements
- Updated README documentation in both English and Chinese
- Added comprehensive keyboard shortcuts
- Enhanced UI responsiveness in focus mode
- Better error handling for Mermaid diagram rendering

### 🔧 Technical Details
- Added `mermaid` package for diagram rendering
- Implemented proper height constraints for CodeMirror editor
- Added CSS customizations for scrollbar visibility
- Integrated command palette component with search functionality

## [0.1.0] - 2025-09-14

### Initial Release
- Basic Markdown editing with live preview
- File management (open, save, new)
- Syntax highlighting
- AI assistant integration
- Multi-tab support
- Search and replace functionality
- Export to HTML/PDF
- Internationalization (zh-CN, en-US)
