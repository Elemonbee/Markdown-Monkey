# Contributing to MarkdownMonkey

## Development Setup

1.  **Prerequisites**:
    - Node.js (v18+)
    - pnpm
    - Rust (stable)

2.  **Install Dependencies**:

    ```bash
    pnpm install
    ```

3.  **Run Development Server**:
    ```bash
    pnpm tauri dev
    ```

## Build

To build the application for production:

```bash
pnpm tauri build
```

## Project Structure

- `src/`: Frontend React code
- `src-tauri/`: Backend Rust code
- `docs/`: Documentation

## Code Style

- **TypeScript**: Follow standard React Hooks patterns. Use `PascalCase` for components and `camelCase` for functions/variables.
- **Rust**: Follow standard Rust formatting (`cargo fmt`).

## Key Commands

- `npx tsc --noEmit`: Run TypeScript type checking.
- `cargo test`: Run Rust backend tests.
