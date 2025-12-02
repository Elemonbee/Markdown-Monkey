# AI Assistant Tutorial

MarkdownMonkey features a powerful built-in AI assistant to boost your writing efficiency.

## 1. Configuration

Before using AI features, you need to configure an AI provider.

1. Click the `Settings` (⚙️) icon in the toolbar.
2. Select **AI Settings**.
3. Choose a **Provider**:
   - **OpenAI Compatible**: For OpenAI, DeepSeek, Kimi, Qwen, etc.
   - **Claude**: For Anthropic Claude models.
   - **Ollama**: For local offline models.
4. Enter your **API Key** (stored securely in OS Keyring).
5. Enter **Base URL** (optional, for custom endpoints).
6. Enter **Model Name** (e.g., `gpt-4o`, `claude-3-5-sonnet`, `llama3`).
7. Click **Test Connection** to verify.

## 2. Context Actions

Select any text in the editor, right-click, and choose an AI action:

- **Continue**: Let AI continue writing based on context.
- **Rewrite**: Improve style, grammar, or tone.
- **Translate**: Translate text to English/Chinese/etc.
- **Summarize**: Generate a concise summary.
- **Custom**: Use your own prompt template.

### Custom Templates

You can define custom templates in Settings using variables:

- `{text}`: Selected text
- `{lang}`: Current language
- `{style}`: Writing style

## 3. AI Chat

Click the `AI Chat` button in the toolbar to open the chat window.

- **Free Conversation**: Chat with AI about anything.
- **Context Aware**: AI knows your current document context.
- **Streaming**: Real-time response generation.
- **Export**: Save chat history to a Markdown file.
- **Insert**: Insert AI response directly into your document.

## 4. Tips

- **Privacy**: Your API Key is encrypted locally. We do not collect your data.
- **Models**: For best results, use capable models like GPT-4o or Claude 3.5 Sonnet.
- **Offline**: Use Ollama with Llama 3 or Qwen for completely offline AI assistance.

Enjoy your AI-powered writing experience! 🚀
