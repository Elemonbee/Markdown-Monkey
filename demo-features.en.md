# MarkdownMonkey Feature Demos

## 1. Auto-save Indicator
Edit this document and watch the save status in the bottom-right of the status bar:
- 🔴 Unsaved — shows immediately after typing
- 🟠 Saving... — shown during the 3-second auto-save window
- 🟢 Saved — shown after a successful save (with timestamp)

## 2. Command Palette
Press **Ctrl+Shift+P** to open the command palette and quickly access:
- File actions (New, Open, Save)
- Export (HTML / PDF)
- UI toggles (Theme / Language / Outline)
- Focus mode toggle

## 3. Focus Mode
Press **F11** to enter focus mode:
- Hide all non-essential UI
- Keep only the editor visible
- Larger font size and line height
- Exit with ESC or F11

## 4. Mermaid Diagram Support

### Flowchart
```mermaid
graph TD
    A[Start] --> B{Logged in?}
    B -->|Yes| C[Home]
    B -->|No| D[Go to Login]
    D --> E[Enter Credentials]
    E --> F[Verify]
    F -->|Success| C
    F -->|Fail| D
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB

    User->>Frontend: Click Login
    Frontend->>Backend: Send request
    Backend->>DB: Query user
    DB-->>Backend: Return data
    Backend-->>Frontend: Return result
    Frontend-->>User: Show status
```

### Gantt Chart
```mermaid
gantt
    title Project Plan
    dateFormat  YYYY-MM-DD
    section Design
    Requirements       :done,    des1, 2024-01-01,2024-01-07
    UI Design          :active,  des2, 2024-01-08, 3d
    DB Design          :         des3, after des2, 5d
    section Development
    Frontend           :         dev1, 2024-01-15, 10d
    Backend            :         dev2, after des3, 10d
    section Testing
    Unit Tests         :         test1, after dev1, 5d
    Integration Tests  :         test2, after test1, 5d
```

### Pie Chart
```mermaid
pie title Programming Languages Share
    "JavaScript" : 45
    "Python"     : 25
    "TypeScript" : 15
    "Go"         : 10
    "Others"     : 5
```

## Shortcuts
- **Ctrl+N** — New document
- **Ctrl+O** — Open file
- **Ctrl+S** — Save
- **Ctrl+F** — Search / Replace
- **Ctrl+Shift+P** — Command palette
- **F11** — Focus mode

Enjoy a faster Markdown writing experience! 🚀
