use futures_util::StreamExt;
use once_cell::sync::Lazy;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{Emitter, Manager};

mod error;
// 注意：error::AppError 已定义，将在后续版本中使用 / Note: error::AppError is defined and will be used in future versions
// use error::AppError;

// 全局工作区根路径（线程安全） / Global workspace root path (thread-safe)
static WORKSPACE_ROOT: Lazy<RwLock<Option<String>>> = Lazy::new(|| RwLock::new(None));

// 文件大小限制：10MB / File size limit: 10MB
// 注意：此常量将在文件操作中使用 / Note: This constant will be used in file operations
#[allow(dead_code)]
const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

// 检查文件大小 / Check file size
// 注意：此函数将在文件打开时使用 / Note: This function will be used when opening files
#[allow(dead_code)]
fn check_file_size(path: &Path) -> Result<(), String> {
    if let Ok(metadata) = std::fs::metadata(path) {
        let size = metadata.len();
        if size > MAX_FILE_SIZE {
            return Err(format!(
                "文件过大 ({:.2} MB)，建议使用专业编辑器",
                size as f64 / 1024.0 / 1024.0
            ));
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 获取命令行参数 / Get command line arguments
    let args: Vec<String> = std::env::args().collect();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 当尝试打开第二个实例时，会调用这个回调 / This callback is called when trying to open a second instance
            // args 是新实例的命令行参数 / args are the command line arguments of the new instance
            if args.len() > 1 {
                let file_path = args[1].clone();
                if file_path.ends_with(".md") || file_path.ends_with(".markdown") {
                    // 转换为绝对路径并规范化路径分隔符 / Convert to absolute path and normalize path separators
                    let abs_path = if std::path::Path::new(&file_path).is_absolute() {
                        file_path.replace('\\', "/")
                    } else {
                        std::env::current_dir()
                            .ok()
                            .and_then(|cwd| cwd.join(&file_path).canonicalize().ok())
                            .and_then(|p| p.to_str().map(|s| s.replace('\\', "/")))
                            .unwrap_or_else(|| file_path.replace('\\', "/"))
                    };
                    // 发送事件到前端打开文件 / Send event to frontend to open file
                    app.emit("open-file", abs_path).ok();
                }
            }
            // 聚焦到已有窗口 / Focus to existing window
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
                window.set_focus().ok();
            }
        }))
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 处理初始命令行参数（如果有传入文件路径） / Handle initial command line arguments (if file path is passed)
            if args.len() > 1 {
                let file_path = args[1].clone();
                // 验证是否为 .md 文件 / Verify if it's a .md file
                if file_path.ends_with(".md") || file_path.ends_with(".markdown") {
                    // 转换为绝对路径并规范化路径分隔符 / Convert to absolute path and normalize path separators
                    let abs_path = if std::path::Path::new(&file_path).is_absolute() {
                        file_path.replace('\\', "/")
                    } else {
                        std::env::current_dir()
                            .ok()
                            .and_then(|cwd| cwd.join(&file_path).canonicalize().ok())
                            .and_then(|p| p.to_str().map(|s| s.replace('\\', "/")))
                            .unwrap_or_else(|| file_path.replace('\\', "/"))
                    };

                    // 发送事件到前端，让前端打开这个文件 / Send event to frontend to let it open this file
                    let app_handle = app.handle().clone();
                    let path_to_open = abs_path.clone();

                    // 延迟发送事件，确保前端已准备好 / Delay sending event to ensure frontend is ready
                    tauri::async_runtime::spawn(async move {
                        // 使用异步延迟，确保前端已准备好 / Use async delay to ensure frontend is ready
                        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
                        app_handle.emit("open-file", path_to_open).ok();
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai_complete,
            ai_complete_stream,
            test_connection,
            list_models,
            list_md_files,
            create_empty_file,
            rename_path,
            delete_path,
            watch_start,
            watch_stop,
            secret_set,
            secret_get,
            secret_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn list_md_files(dir: String) -> Result<Vec<String>, String> {
    set_workspace_root(&dir);
    fn walk_collect(p: PathBuf, out: &mut Vec<String>) {
        if let Ok(rd) = std::fs::read_dir(&p) {
            for e in rd.flatten() {
                let path = e.path();
                if path.is_dir() {
                    walk_collect(path, out);
                } else if let Some(ext) = path.extension() {
                    let e = ext.to_string_lossy().to_lowercase();
                    if e == "md" || e == "markdown" {
                        if let Some(s) = path.to_str() {
                            out.push(s.to_string());
                        }
                    }
                }
            }
        }
    }
    let mut out = Vec::new();
    walk_collect(PathBuf::from(dir), &mut out);
    Ok(out)
}

fn set_workspace_root(dir: &str) {
    if let Ok(mut guard) = WORKSPACE_ROOT.write() {
        *guard = Some(dir.to_string());
    }
}

fn ensure_in_workspace(path: &Path) -> Result<(), String> {
    // 先规范化路径，这会解析符号链接
    let p = std::fs::canonicalize(path).map_err(|e| {
        log::warn!("Failed to canonicalize path: {:?}", e);
        "无法访问指定路径".to_string()
    })?;

    let root = WORKSPACE_ROOT
        .read()
        .map_err(|_| "工作区锁定失败".to_string())?
        .clone()
        .ok_or_else(|| "未设置工作区".to_string())?;

    let root_c = std::fs::canonicalize(&root).map_err(|e| {
        log::warn!("Failed to canonicalize workspace root: {:?}", e);
        "工作区路径无效".to_string()
    })?;

    // 检查规范化后的路径是否在工作区内
    if !p.starts_with(&root_c) {
        log::warn!("Path {:?} is outside workspace {:?}", p, root_c);
        return Err("路径不在工作区内".to_string());
    }

    // 额外检查：确保路径不包含 .. 组件（防止路径遍历）
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        log::warn!("Path contains parent directory component: {:?}", path);
        return Err("路径包含非法字符".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn create_empty_file(path: String) -> Result<(), String> {
    use std::io::Write;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        ensure_in_workspace(parent)?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    ensure_in_workspace(Path::new(&path))?;
    let mut f = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    f.write_all(b"").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn rename_path(src: String, dst: String) -> Result<(), String> {
    ensure_in_workspace(Path::new(&src))?;
    if let Some(parent) = Path::new(&dst).parent() {
        ensure_in_workspace(parent)?;
    }
    std::fs::rename(src, dst).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_path(target: String) -> Result<(), String> {
    let p = std::path::Path::new(&target);
    ensure_in_workspace(p)?;
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())?
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())?
    }
    Ok(())
}

static WATCHER: Lazy<std::sync::Mutex<Option<notify::RecommendedWatcher>>> =
    Lazy::new(|| std::sync::Mutex::new(None));

// 简易加密存储：使用系统凭据管理器（Windows Credential Manager / macOS Keychain / Secret Service）
#[tauri::command]
async fn secret_set(service: String, key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
async fn secret_get(service: String, key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn secret_delete(service: String, key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn watch_start(app: tauri::AppHandle, dir: String) -> Result<(), String> {
    use notify::{RecursiveMode, Watcher};
    let app_handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |_res| {
        let _ = app_handle.emit("fs:changed", "");
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(std::path::Path::new(&dir), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    *WATCHER.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
async fn watch_stop() -> Result<(), String> {
    *WATCHER.lock().unwrap() = None;
    Ok(())
}

/// ai_complete
/// 基于可配置的 HTTP API（如 OpenAI 兼容）完成续写
#[tauri::command]
async fn ai_complete(req: AiRequest) -> Result<String, String> {
    let client = reqwest::Client::new();

    match req.provider {
        Provider::OpenAI | Provider::DeepSeek | Provider::Kimi | Provider::OpenRouter => {
            // OpenAI 兼容
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&req.provider).to_string());
            let url = join_base_and_v1_path(&base, "/chat/completions");
            let mut messages = vec![];
            if let Some(system_prompt) = &req.system_prompt {
                if !system_prompt.is_empty() {
                    messages.push(serde_json::json!({"role": "system", "content": system_prompt}));
                }
            }
            messages.push(serde_json::json!({"role": "user", "content": req.prompt}));

            let mut body = serde_json::json!({
              "model": req.model.unwrap_or_else(|| default_model_for_provider(&req.provider).to_string()),
              "messages": messages,
            });
            if let Some(t) = req.temperature {
                body["temperature"] = serde_json::json!(t);
            }
            if let Some(mt) = req.max_tokens {
                body["max_tokens"] = serde_json::json!(mt);
            }

            let mut request = client.post(url).bearer_auth(req.api_key.trim());
            if matches!(req.provider, Provider::OpenRouter) {
                // OpenRouter 推荐附带 Referer/X-Title，但不是强制
                request = request
                    .header("HTTP-Referer", "https://github.com/")
                    .header("X-Title", "MarkdownMonkey");
            }
            let resp = request
                .header("accept", "text/event-stream")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("AI API error: {} {}", status, text));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let content = v["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        }
        Provider::Ollama => {
            // Ollama /api/chat（本地模型）
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&req.provider).to_string());
            let url = format!("{}/api/chat", base.trim_end_matches('/'));
            let mut messages = vec![];
            if let Some(system_prompt) = &req.system_prompt {
                if !system_prompt.is_empty() {
                    messages.push(serde_json::json!({"role": "system", "content": system_prompt}));
                }
            }
            messages.push(serde_json::json!({"role": "user", "content": req.prompt}));

            let mut body = serde_json::json!({
              "model": req.model.unwrap_or_else(|| default_model_for_provider(&req.provider).to_string()),
              "messages": messages,
              "stream": false
            });
            if let Some(t) = req.temperature {
                body["options"] = serde_json::json!({"temperature": t});
            }

            let resp = client
                .post(url)
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("AI API error: {} {}", status, text));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let content = v["message"]["content"].as_str().unwrap_or("").to_string();
            Ok(content)
        }
        Provider::Claude => {
            // Anthropic Claude v1/messages
            let base = req
                .base_url
                .unwrap_or_else(|| "https://api.anthropic.com".to_string());
            let url = join_base_and_v1_path(&base, "/messages");
            let mut body = serde_json::json!({
              "model": req.model.unwrap_or_else(|| "claude-3-5-sonnet-latest".to_string()),
              "messages": [
                {"role": "user", "content": req.prompt}
              ],
            });
            if let Some(system_prompt) = &req.system_prompt {
                body["system"] = serde_json::json!(system_prompt);
            }
            if let Some(t) = req.temperature {
                body["temperature"] = serde_json::json!(t);
            }
            if let Some(mt) = req.max_tokens {
                body["max_tokens"] = serde_json::json!(mt);
            }

            let resp = client
                .post(url)
                .header("x-api-key", req.api_key.trim())
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("AI API error: {} {}", status, text));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            // Claude 返回内容在 content 数组中
            let content = v["content"][0]["text"].as_str().unwrap_or("").to_string();
            Ok(content)
        }
    }
}

/// ai_complete_stream
/// 以 Server-Sent Events 形式流式返回（仅 OpenAI 兼容与 Claude；Ollama 走 stream=false 简化）
#[tauri::command]
async fn ai_complete_stream(app: tauri::AppHandle, req: AiRequest) -> Result<(), String> {
    let client = reqwest::Client::new();

    match req.provider {
        Provider::OpenAI | Provider::DeepSeek | Provider::Kimi | Provider::OpenRouter => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&req.provider).to_string());
            let url = join_base_and_v1_path(&base, "/chat/completions");
            let mut messages = vec![];
            if let Some(ms) = &req.messages {
                for m in ms {
                    messages.push(serde_json::json!({"role": m.role, "content": m.content}));
                }
            } else {
                if let Some(system_prompt) = &req.system_prompt {
                    if !system_prompt.is_empty() {
                        messages.push(serde_json::json!({"role":"system","content":system_prompt}));
                    }
                }
                messages.push(serde_json::json!({"role":"user","content": req.prompt}));
            }
            let mut body = serde_json::json!({"model": req.model.unwrap_or_else(|| default_model_for_provider(&req.provider).to_string()), "messages": messages, "stream": true});
            if let Some(t) = req.temperature {
                body["temperature"] = serde_json::json!(t);
            }
            let mut request = client
                .post(url)
                .bearer_auth(req.api_key.trim())
                .header("accept", "text/event-stream")
                .header("cache-control", "no-cache");
            if matches!(req.provider, Provider::OpenRouter) {
                request = request
                    .header("HTTP-Referer", "https://github.com/")
                    .header("X-Title", "MarkdownMonkey");
            }
            let resp = request
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("AI API error: {}", resp.status()));
            }
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();
            let mut done = false;
            while let Some(chunk) = stream.next().await {
                let bytes = chunk.map_err(|e| e.to_string())?;
                let text = String::from_utf8_lossy(&bytes);
                buffer.push_str(&text);
                loop {
                    if let Some(idx) = buffer.find('\n') {
                        let line = buffer[..idx].trim_end_matches('\r').to_string();
                        buffer.drain(..=idx);
                        if line.is_empty() {
                            continue;
                        }
                        // 只转发完整的 data: 行，保证前端能解析
                        if line.starts_with("data:") {
                            let data = line[5..].trim();
                            if data == "[DONE]" {
                                let _ = app.emit("ai:stream", "data: [DONE]".to_string());
                                done = true;
                                break;
                            }
                            let _ = app.emit("ai:stream", format!("data: {}", data));
                        } else {
                            // 非 data 行也转发，前端可作兜底处理
                            let _ = app.emit("ai:stream", line);
                        }
                    } else {
                        break;
                    }
                }
                if done {
                    break;
                }
            }
            if !done {
                let _ = app.emit("ai:stream", "data: [DONE]".to_string());
            }
            Ok(())
        }
        Provider::Claude => {
            let base = req
                .base_url
                .unwrap_or_else(|| "https://api.anthropic.com".to_string());
            let url = join_base_and_v1_path(&base, "/messages");
            let mut body = serde_json::json!({
              "model": req.model.unwrap_or_else(|| "claude-3-5-sonnet-latest".to_string()),
              "messages": [],
              "stream": true
            });
            if let Some(ms) = &req.messages {
                let mut arr: Vec<serde_json::Value> = vec![];
                for m in ms {
                    let role = if m.role == "assistant" {
                        "assistant"
                    } else {
                        "user"
                    };
                    arr.push(serde_json::json!({"role": role, "content": [{"type":"text","text": m.content}]}));
                }
                body["messages"] = serde_json::json!(arr);
            } else {
                body["messages"] = serde_json::json!([{"role":"user","content":[{"type":"text","text": req.prompt}]}]);
            }
            if let Some(system_prompt) = &req.system_prompt {
                body["system"] = serde_json::json!(system_prompt);
            }
            if let Some(t) = req.temperature {
                body["temperature"] = serde_json::json!(t);
            }
            let resp = client
                .post(url)
                .header("x-api-key", req.api_key.trim())
                .header("anthropic-version", "2023-06-01")
                .header("accept", "text/event-stream")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("AI API error: {}", resp.status()));
            }
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();
            let mut done = false;
            while let Some(chunk) = stream.next().await {
                let bytes = chunk.map_err(|e| e.to_string())?;
                let text = String::from_utf8_lossy(&bytes);
                buffer.push_str(&text);
                loop {
                    if let Some(idx) = buffer.find('\n') {
                        let line = buffer[..idx].trim_end_matches('\r').to_string();
                        buffer.drain(..=idx);
                        if line.is_empty() {
                            continue;
                        }
                        if line.starts_with("data:") {
                            let data = line[5..].trim();
                            if data == "[DONE]" {
                                let _ = app.emit("ai:stream", "data: [DONE]".to_string());
                                done = true;
                                break;
                            }
                            let _ = app.emit("ai:stream", format!("data: {}", data));
                        } else {
                            let _ = app.emit("ai:stream", line);
                        }
                    } else {
                        break;
                    }
                }
                if done {
                    break;
                }
            }
            if !done {
                let _ = app.emit("ai:stream", "data: [DONE]".to_string());
            }
            Ok(())
        }
        Provider::Ollama => {
            // 简化：非流式，直接返回完成
            let _ = ai_complete(req).await?; // 仍可配合前端轮询/直接完成
            Ok(())
        }
    }
}

/// Provider
/// AI 提供商枚举
#[derive(serde::Deserialize)]
enum Provider {
    #[serde(rename = "open_ai", alias = "openai", alias = "open_a_i")]
    OpenAI,
    #[serde(rename = "claude")]
    Claude,
    #[serde(rename = "deep_seek", alias = "deepseek")]
    DeepSeek,
    #[serde(rename = "kimi")]
    Kimi,
    #[serde(rename = "open_router", alias = "openrouter")]
    OpenRouter,
    #[serde(rename = "ollama")]
    Ollama,
}

/// Chat message
#[derive(serde::Deserialize)]
struct Message {
    role: String,
    content: String,
}

/// AiRequest
/// AI 续写请求参数
#[derive(serde::Deserialize)]
struct AiRequest {
    provider: Provider,
    api_key: String,
    prompt: String,
    model: Option<String>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    base_url: Option<String>,
    messages: Option<Vec<Message>>,
}

/// default_base_for_provider
/// 返回不同提供商的默认基础 URL
fn default_base_for_provider(p: &Provider) -> &'static str {
    match p {
        Provider::OpenAI => "https://api.openai.com",
        Provider::DeepSeek => "https://api.deepseek.com",
        Provider::Kimi => "https://api.moonshot.cn",
        Provider::OpenRouter => "https://openrouter.ai/api",
        Provider::Claude => "https://api.anthropic.com",
        Provider::Ollama => "http://127.0.0.1:11434",
    }
}

/// default_model_for_provider
/// 返回每家提供商的默认模型
fn default_model_for_provider(p: &Provider) -> &'static str {
    match p {
        Provider::OpenAI => "gpt-4o-mini",
        Provider::DeepSeek => "deepseek-chat",
        Provider::Kimi => "moonshot-v1-8k",
        Provider::OpenRouter => "openrouter/auto",
        Provider::Claude => "claude-3-5-sonnet-latest",
        Provider::Ollama => "llama3",
    }
}

/// test_connection
/// 测试不同 Provider 的连通性（不产生成本的轻量健康检查）
#[tauri::command]
async fn test_connection(req: TestConnRequest) -> Result<String, String> {
    let client = reqwest::Client::new();
    match req.provider {
        Provider::Ollama => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&Provider::Ollama).to_string());
            let url = format!("{}/api/tags", base.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            Ok("Ollama API 可用".to_string())
        }
        Provider::OpenAI | Provider::DeepSeek | Provider::Kimi | Provider::OpenRouter => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&req.provider).to_string());
            let url = join_base_and_v1_path(&base, "/models");
            let resp = client
                .get(url)
                .bearer_auth(req.api_key.unwrap_or_default())
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            let msg = match req.provider {
                Provider::OpenRouter => "OpenRouter API 可用",
                Provider::OpenAI => "OpenAI API 可用",
                Provider::DeepSeek => "DeepSeek API 可用",
                Provider::Kimi => "Kimi API 可用",
                _ => "API 可用",
            };
            Ok(msg.to_string())
        }
        Provider::Claude => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&Provider::Claude).to_string());
            let url = join_base_and_v1_path(&base, "/models");
            let resp = client
                .get(url)
                .header("x-api-key", req.api_key.unwrap_or_default())
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            Ok("Claude API 可用".to_string())
        }
    }
}

/// TestConnRequest
/// 测试连通性请求
#[derive(serde::Deserialize)]
struct TestConnRequest {
    provider: Provider,
    api_key: Option<String>,
    base_url: Option<String>,
}

/// join_base_and_v1_path
/// 如果 base 已经以 /v1 结尾，则直接拼接 tail；否则补上 /v1 再拼接
fn join_base_and_v1_path(base: &str, tail: &str) -> String {
    let b = base.trim_end_matches('/');
    if b.ends_with("/v1") {
        format!("{}{}", b, tail)
    } else {
        format!("{}/v1{}", b, tail)
    }
}

/// list_models
/// 根据 provider 列出可用模型（用于前端下拉）
#[tauri::command]
async fn list_models(req: ListModelsRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    match req.provider {
        Provider::Ollama => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&Provider::Ollama).to_string());
            let url = format!("{}/api/tags", base.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            // 适配返回结构
            Ok(v)
        }
        Provider::Claude => {
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&Provider::Claude).to_string());
            let url = join_base_and_v1_path(&base, "/models");
            let resp = client
                .get(url)
                .header("x-api-key", req.api_key.unwrap_or_default())
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(v)
        }
        _ => {
            // OpenAI 兼容族
            let base = req
                .base_url
                .unwrap_or_else(|| default_base_for_provider(&req.provider).to_string());
            let url = join_base_and_v1_path(&base, "/models");
            let resp = client
                .get(url)
                .bearer_auth(req.api_key.unwrap_or_default())
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status()));
            }
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(v)
        }
    }
}

#[derive(serde::Deserialize)]
struct ListModelsRequest {
    provider: Provider,
    api_key: Option<String>,
    base_url: Option<String>,
}
