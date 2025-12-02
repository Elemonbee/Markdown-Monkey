# Frequently Asked Questions (FAQ)

## General

### Q: Is MarkdownMonkey free?

A: Yes, MarkdownMonkey is open-source software released under the MIT license. You can use it for free. However, if you use commercial AI APIs (like OpenAI), you need to pay the provider directly.

### Q: Which platforms are supported?

A: Windows, macOS, and Linux.

## AI Features

### Q: Why is the AI response slow?

A: This depends on the API provider and model you chose. Local models (Ollama) depend on your hardware performance.

### Q: Can I use it offline?

A: Yes! You can use the editor offline. For AI features, you can use Ollama to run local models without internet access.

### Q: Is my data safe?

A: Yes. MarkdownMonkey is a local-first app. Your documents are stored locally. API Keys are stored in your system's secure keyring. We do not collect or upload your data.

## Troubleshooting

### Q: "OpenAI Compatible" provider not working?

A: Please check:

1. Is the API Key correct?
2. Is the Base URL correct? (e.g., `https://api.deepseek.com/v1`)
3. Is the Model Name correct?
4. Click "Test Connection" to verify.

### Q: Image paste not working?

A: Ensure you have write permissions to the folder where your Markdown file is located. Images are saved to an `images/` subdirectory.

### Q: How to reset settings?

A: You can clear the application data or manually edit the settings file if needed (advanced).

## Contact

If you have more questions, please submit an issue on our GitHub repository.
