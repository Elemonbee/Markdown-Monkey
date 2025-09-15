# MarkdownMonkey 新功能演示

## 1. 自动保存指示器
编辑这个文档，你会看到状态栏右下角显示保存状态：
- 🔴 未保存 - 编辑后立即显示
- 🟠 保存中... - 3秒后自动保存时显示
- 🟢 已保存 - 保存成功后显示（带时间戳）

## 2. 命令面板
按下 **Ctrl+Shift+P** 打开命令面板，可以快速访问所有功能：
- 文件操作（新建、打开、保存）
- 导出功能（HTML、PDF）
- 界面切换（主题、语言、大纲）
- 专注模式切换

## 3. 专注模式
按下 **F11** 进入专注模式：
- 隐藏所有UI元素
- 只保留编辑器
- 更大的字体和行距
- 按 ESC 或 F11 退出

## 4. Mermaid 图表支持

### 流程图示例
```mermaid
graph TD
    A[开始] --> B{是否登录?}
    B -->|是| C[进入主页]
    B -->|否| D[跳转登录]
    D --> E[输入账号密码]
    E --> F[验证]
    F -->|成功| C
    F -->|失败| D
```

### 时序图示例
```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 点击登录
    前端->>后端: 发送登录请求
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户数据
    后端-->>前端: 返回登录结果
    前端-->>用户: 显示登录状态
```

### 甘特图示例
```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析           :done,    des1, 2024-01-01,2024-01-07
    界面设计           :active,  des2, 2024-01-08, 3d
    数据库设计         :         des3, after des2, 5d
    section 开发阶段
    前端开发           :         dev1, 2024-01-15, 10d
    后端开发           :         dev2, after des3, 10d
    section 测试阶段
    单元测试           :         test1, after dev1, 5d
    集成测试           :         test2, after test1, 5d
```

### 饼图示例
```mermaid
pie title 编程语言使用比例
    "JavaScript" : 45
    "Python" : 25
    "TypeScript" : 15
    "Go" : 10
    "其他" : 5
```

## 快捷键汇总
- **Ctrl+N** - 新建文档
- **Ctrl+O** - 打开文件
- **Ctrl+S** - 保存
- **Ctrl+F** - 搜索替换
- **Ctrl+Shift+P** - 命令面板
- **F11** - 专注模式

享受更高效的 Markdown 写作体验！🚀
