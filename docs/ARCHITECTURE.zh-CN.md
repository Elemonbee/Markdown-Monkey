# 架构文档

## 概览

MarkdownMonkey 经历了一次重大重构，从单体 `App.tsx` 架构转变为模块化的 Hooks 架构。本文档概述了当前的结构和关键组件。

## 核心架构

应用状态通过一组自定义 React Hooks 进行管理，每个 Hook 负责特定的领域。这种关注点分离提高了可维护性、可测试性和代码可读性。

### 关键 Hooks

| Hook                 | 文件                              | 职责                                                         |
| -------------------- | --------------------------------- | ------------------------------------------------------------ |
| `useEditorState`     | `src/hooks/useEditorState.ts`     | 管理编辑器 UI 状态（字体大小、主题等）和 CodeMirror 引用。   |
| `useFileManager`     | `src/hooks/useFileManager.ts`     | 处理文件操作（打开、保存、读取、写入）、标签管理和文件监听。 |
| `useSettingsManager` | `src/hooks/useSettingsManager.ts` | 使用 `@tauri-apps/plugin-store` 管理应用设置的持久化。       |
| `usePreviewManager`  | `src/hooks/usePreviewManager.ts`  | 处理 Markdown 渲染、Mermaid 图表处理和滚动同步的块级映射。   |
| `useAI`              | `src/hooks/useAI.ts`              | 处理 AI API 交互（OpenAI 等）和流式响应。                    |
| `useAIState`         | `src/hooks/useAIState.ts`         | 管理 AI 相关的 UI 状态（聊天可见性、加载状态、历史记录）。   |
| `useMermaidCache`    | `src/hooks/useMermaidCache.ts`    | 缓存渲染后的 Mermaid 图表以提高性能。                        |
| `useMemoryLimit`     | `src/hooks/useMemoryLimit.ts`     | 通过限制文档大小防止内存溢出。                               |
| `useScrollSync`      | `src/hooks/useScrollSync.ts`      | 同步编辑器和预览之间的滚动。                                 |

### 数据流

1.  **App 组件**: `App.tsx` 作为主要的协调者。它初始化这些 hooks 并将必要的状态和操作传递给 UI 组件。
2.  **状态管理**: 每个 hook 管理自己的本地状态（使用 `useState`, `useReducer`）并向消费者暴露清晰的 API（值和 setter 函数）。
3.  **持久化**: `useSettingsManager` 处理将用户首选项保存到磁盘，确保状态在重载后保持不变。

## 目录结构

```
src/
├── components/         # UI 组件 (模态框, 上下文菜单等)
├── config/             # 常量和配置
├── hooks/              # 自定义 React Hooks (核心逻辑)
├── utils/              # 辅助函数 (验证, 剪贴板等)
├── App.tsx             # 主应用组件
├── main.tsx            # 入口点
└── i18n.ts             # 国际化
```

## Rust 后端

Rust 后端 (`src-tauri/`) 提供安全的系统访问：

- **文件系统**: 范围受限的文件访问，防止未经授权的读取/写入。
- **错误处理**: 统一的错误模块 (`error.rs`) 用于清理后的错误报告。
- **安全性**: 路径验证以防止遍历攻击。

## 开发指南

- **新功能**: 在集成到 `App.tsx` 之前，在 `src/hooks/` 中实现新的或现有的 Hook 逻辑。
- **状态**: 避免直接向 `App.tsx` 添加 `useState`，除非它是根组件的严格本地 UI 状态。
- **类型**: 为 Hook 返回值定义接口以确保类型安全。
