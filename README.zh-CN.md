![editor](assets/icon.svg)
# MarkdownMonkey

![en](https://img.shields.io/badge/lang-English-blue) ![zh](https://img.shields.io/badge/lang-zh--CN-brightgreen) ![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white) ![Rust](https://img.shields.io/badge/Rust-stable-000?logo=rust&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)

一个基于 Tauri（Rust）+ React/TypeScript 的 Markdown 编辑器。

- 实时预览与代码高亮
- 可拖拽分栏
- 大纲与文件树
- AI 助手（OpenAI 兼容 / Claude / DeepSeek / Kimi / OpenRouter / Ollama）
- 本地历史快照与自动保存

[English Guide](README.md)

> 本项目为 Vibe Coding 项目，所有代码由 AI 生成。

 

## 开发

```
pnpm install
pnpm tauri dev
```

## 构建

```
pnpm tauri build
```

## 功能

- 编辑器：CodeMirror + Markdown 扩展
- 预览：marked + DOMPurify + highlight.js
- 文件：打开/保存、打开文件夹（递归）、粘贴图片入本地目录、文件树与多标签
- 搜索替换：正则、高亮（编辑器/预览）
- AI：右键动作、AI 对话窗口（可最小化/拖拽/记忆位置）、提供商/模型切换、SSE 流式输出
- 持久化：@tauri-apps/plugin-store

## 使用说明
- 打开文件：点击顶部“打开”或拖拽 `.md` 文件进窗口
- 打开文件夹：点击“打开文件夹”，左侧文件树列出 `.md` 文件
- 右键菜单：在编辑区选中文本后右键，可使用 AI 动作
- 大纲面板：点击“显示大纲”切换，支持标题跳转与宽度拖拽
- 搜索替换：点击“搜索/替换”，支持正则、编辑区/预览高亮
- 导出：支持导出 HTML 与 PDF（前端生成）

## 截图

<!-- 将实际截图放入 assets/ 目录并提交。以下为占位路径。 -->
![editor](assets/screenshot.png)
![ai-chat](assets/screenshot2.png)

## 快捷键
- Ctrl+O：打开文件
- Ctrl+S：保存
- Ctrl+P：计划中（快速打开）
- Ctrl+Shift+F：计划中（全局搜索）

## 国际化
`src/i18n.ts` 提供 `zh-CN` 与 `en-US` 字符串，UI 从设置中的 `ui_language` 读取并渲染。

## 许可证
MIT
