# Changelog / 更新日志

All notable changes to MarkdownMonkey will be documented in this file.
本文件记录 MarkdownMonkey 的所有重要更新。

## [0.2.0] - 2025-09-29

### 🎉 New Features / 新功能

#### English
- Synced dual‑pane preview with toggle: two‑way linked scrolling between editor and preview.
- Command Palette Quick Open (Ctrl+P): quick switch between open tabs and recent files; Alt+1..9 for top recent items.

#### 中文
- 同步双栏预览（可开关）：编辑区与预览区双向联动滚动。
- 命令面板快速打开（Ctrl+P）：在已打开标签与最近文件间快速切换；Alt+1..9 打开前 9 个最近项。

### 📝 Improvements / 改进

#### English
- Stabilized scroll behavior and preview sync on large documents.
- Updated documentation and shortcuts to reflect new features.

#### 中文
- 在大文档下优化滚动与预览同步的稳定性。
- 更新了文档与快捷键，反映新增能力。

### 🔧 Technical Details / 技术细节

#### English
- Injected dynamic commands into Command Palette from `open_tabs` and `recent_files`.
- Added `Ctrl+P` handler alongside `Ctrl+Shift+P`; persisted settings with `@tauri-apps/plugin-store`.
- Version bumped across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` to 0.2.0.

#### 中文
- 将 `open_tabs` 与 `recent_files` 动态注入命令面板。
- 新增 `Ctrl+P` 快捷键（与 `Ctrl+Shift+P` 并存）；设置通过 `@tauri-apps/plugin-store` 持久化。
- 统一将 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 升级为 0.2.0。

## [0.1.1.1] - 2025-09-19

### 🐛 Bug Fixes / 问题修复

#### English
- **Fixed New Document Tab Issue**: Creating a new document now properly creates a new tab (Untitled-1, Untitled-2, etc.) instead of replacing the current document. Multiple unsaved documents can now be opened simultaneously.
- **Fixed File Association**: Fixed the issue where .md files couldn't be opened by double-clicking or using "Open with" context menu. The application now properly handles command-line arguments and supports single-instance mode.
- **Code Quality Improvements**: Removed all debug console.log statements and println! calls for production-ready code.
 - **ESLint/Linter Fixes**: Replaced implicit `any`, added missing hook dependencies, and tightened types for safer builds.

#### 中文
- **修复新建文档标签问题**：新建文档现在会正确创建新标签（Untitled-1、Untitled-2 等），而不是替换当前文档。支持同时打开多个未保存的文档。
- **修复文件关联问题**：修复了无法通过双击或"打开方式"菜单打开 .md 文件的问题。应用程序现在能正确处理命令行参数并支持单实例模式。
- **代码质量改进**：移除了所有调试用的 console.log 语句和 println! 调用，使代码更适合生产环境。
 - **ESLint 修复**：替换隐式 `any`、补齐缺失的 Hook 依赖、收紧类型，确保更严谨的构建。

### 🔧 Technical Details / 技术细节

#### English
- Implemented proper untitled document management with memory storage
- Added single-instance plugin support for file association
- Improved path normalization for cross-platform compatibility
- Enhanced error handling with silent failures for better user experience

#### 中文
- 实现了正确的未命名文档管理，使用内存存储
- 添加了单实例插件支持以实现文件关联
- 改进了路径规范化以提高跨平台兼容性
- 增强了错误处理，采用静默失败以改善用户体验

## [0.1.1] - 2025-09-15

### 🎉 New Features / 新功能

#### English
- **Auto-save Indicator**: Real-time display of document save status in the status bar with color-coded indicators (green/orange/red). Documents are automatically saved 3 seconds after editing.
- **Command Palette** (Ctrl+Shift+P): Quick access to all features with search filtering and keyboard navigation support.
- **Focus Mode** (F11): Immersive writing experience that hides all UI elements except the editor, with larger font size and line height for better readability.
- **Mermaid Diagram Support**: Automatic rendering of various diagram types including flowcharts, sequence diagrams, Gantt charts, and pie charts. Diagrams adapt to light/dark themes.

#### 中文
- **自动保存指示器**：在状态栏实时显示文档保存状态，使用颜色编码指示器（绿色/橙色/红色）。文档在编辑后3秒自动保存。
- **命令面板**（Ctrl+Shift+P）：快速访问所有功能，支持搜索过滤和键盘导航。
- **专注模式**（F11）：沉浸式写作体验，隐藏除编辑器外的所有UI元素，更大的字体和行高提供更好的可读性。
- **Mermaid 图表支持**：自动渲染各种图表类型，包括流程图、序列图、甘特图和饼图。图表自适应明暗主题。

### 🐛 Bug Fixes / 问题修复

#### English
- **Fixed Word Count Statistics**: Improved accuracy of word count for mixed Chinese-English content. Now correctly counts English words and CJK characters separately.
- **Fixed Scrollbar Issues**: Resolved problems with both horizontal and vertical scrollbars not appearing correctly in the CodeMirror editor, especially when opening existing documents. Scrollbars now display properly based on content overflow.

#### 中文
- **修复字数统计**：提高了中英文混合内容字数统计的准确性。现在能正确分别统计英文单词和CJK字符。
- **修复滚动条问题**：解决了 CodeMirror 编辑器中水平和垂直滚动条无法正确显示的问题，特别是打开现有文档时。滚动条现在能根据内容溢出正确显示。

### 📝 Improvements / 改进

#### English
- Updated README documentation in both English and Chinese
- Added comprehensive keyboard shortcuts
- Enhanced UI responsiveness in focus mode
- Better error handling for Mermaid diagram rendering

#### 中文
- 更新了中英文 README 文档
- 添加了完整的键盘快捷键
- 增强了专注模式下的 UI 响应性
- 改进了 Mermaid 图表渲染的错误处理

### 🔧 Technical Details / 技术细节

#### English
- Added `mermaid` package for diagram rendering
- Implemented proper height constraints for CodeMirror editor
- Added CSS customizations for scrollbar visibility
- Integrated command palette component with search functionality

#### 中文
- 添加了 `mermaid` 包用于图表渲染
- 为 CodeMirror 编辑器实现了正确的高度约束
- 添加了用于滚动条可见性的 CSS 自定义
- 集成了带搜索功能的命令面板组件

## [0.1.0] - 2025-09-14

### Initial Release / 初始版本

#### English
- Basic Markdown editing with live preview
- File management (open, save, new)
- Syntax highlighting
- AI assistant integration
- Multi-tab support
- Search and replace functionality
- Export to HTML/PDF
- Internationalization (zh-CN, en-US)

#### 中文
- 基础 Markdown 编辑与实时预览
- 文件管理（打开、保存、新建）
- 语法高亮
- AI 助手集成
- 多标签页支持
- 搜索和替换功能
- 导出为 HTML/PDF
- 国际化支持（中文、英文）
