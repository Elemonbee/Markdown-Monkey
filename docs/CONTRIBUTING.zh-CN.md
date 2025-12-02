# 贡献指南

## 开发环境设置

1.  **先决条件**:
    - Node.js (v18+)
    - pnpm
    - Rust (stable)

2.  **安装依赖**:

    ```bash
    pnpm install
    ```

3.  **运行开发服务器**:
    ```bash
    pnpm tauri dev
    ```

## 构建

构建生产环境应用：

```bash
pnpm tauri build
```

## 项目结构

- `src/`: 前端 React 代码
- `src-tauri/`: 后端 Rust 代码
- `docs/`: 文档

## 代码风格

- **TypeScript**: 遵循标准的 React Hooks 模式。组件使用 `PascalCase`，函数/变量使用 `camelCase`。
- **Rust**: 遵循标准 Rust 格式化 (`cargo fmt`)。

## 关键命令

- `npx tsc --noEmit`: 运行 TypeScript 类型检查。
- `cargo test`: 运行 Rust 后端测试。
