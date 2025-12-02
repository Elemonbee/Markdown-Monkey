# Architecture Documentation

## Overview

MarkdownMonkey has undergone a major refactoring to transition from a monolithic `App.tsx` to a modular, Hooks-based architecture. This document outlines the current structure and key components.

## Core Architecture

The application state is managed through a set of custom React Hooks, each responsible for a specific domain. This separation of concerns improves maintainability, testability, and code readability.

### Key Hooks

| Hook                 | File                              | Responsibility                                                                           |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `useEditorState`     | `src/hooks/useEditorState.ts`     | Manages editor UI state (font size, theme, etc.) and CodeMirror refs.                    |
| `useFileManager`     | `src/hooks/useFileManager.ts`     | Handles file operations (open, save, read, write), tab management, and file watching.    |
| `useSettingsManager` | `src/hooks/useSettingsManager.ts` | Manages application settings persistence using `@tauri-apps/plugin-store`.               |
| `usePreviewManager`  | `src/hooks/usePreviewManager.ts`  | Handles Markdown rendering, Mermaid chart processing, and block mapping for scroll sync. |
| `useAI`              | `src/hooks/useAI.ts`              | Handles AI API interactions (OpenAI, etc.) and streaming responses.                      |
| `useAIState`         | `src/hooks/useAIState.ts`         | Manages AI-related UI state (chat visibility, loading state, history).                   |
| `useMermaidCache`    | `src/hooks/useMermaidCache.ts`    | Caches rendered Mermaid diagrams for performance.                                        |
| `useMemoryLimit`     | `src/hooks/useMemoryLimit.ts`     | Prevents memory overflows by limiting document sizes.                                    |
| `useScrollSync`      | `src/hooks/useScrollSync.ts`      | Synchronizes scrolling between editor and preview.                                       |

### Data Flow

1.  **App Component**: `App.tsx` acts as the main orchestrator. It initializes these hooks and passes the necessary state and actions to UI components.
2.  **State Management**: Each hook manages its own local state (using `useState`, `useReducer`) and exposes a clean API (values and setter functions) to the consumer.
3.  **Persistence**: `useSettingsManager` handles saving user preferences to disk, ensuring state persists across reloads.

## Directory Structure

```
src/
├── components/         # UI Components (Modals, Context Menus, etc.)
├── config/             # Constants and configuration
├── hooks/              # Custom React Hooks (Core Logic)
├── utils/              # Helper functions (Validation, Clipboard, etc.)
├── App.tsx             # Main Application Component
├── main.tsx            # Entry Point
└── i18n.ts             # Internationalization
```

## Rust Backend

The Rust backend (`src-tauri/`) provides secure system access:

- **File System**: Scoped file access to prevent unauthorized reads/writes.
- **Error Handling**: Unified error module (`error.rs`) for sanitized error reporting.
- **Security**: Path validation to prevent traversal attacks.

## Development Guidelines

- **New Features**: Implement logic in a new or existing Hook in `src/hooks/` before integrating into `App.tsx`.
- **State**: Avoid adding `useState` directly to `App.tsx` unless it is strictly local UI state for the root component.
- **Types**: Define interfaces for Hook return values to ensure type safety.
