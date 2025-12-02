/// 统一错误处理模块
/// 避免将敏感信息暴露给前端

use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Io(std::io::Error),
    Network(String),
    ApiError { status: u16, message: String },
    Unauthorized,
    InvalidInput(String),
    WorkspaceError(String),
    Unknown(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Io(_) => write!(f, "文件操作失败"),
            AppError::Network(_) => write!(f, "网络请求失败"),
            AppError::ApiError { status, message } => {
                write!(f, "API 错误 ({}): {}", status, sanitize_error_message(message))
            }
            AppError::Unauthorized => write!(f, "认证失败，请检查 API Key"),
            AppError::InvalidInput(msg) => write!(f, "输入无效: {}", msg),
            AppError::WorkspaceError(msg) => write!(f, "工作区错误: {}", msg),
            AppError::Unknown(_) => write!(f, "未知错误"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            AppError::Network("请求超时".to_string())
        } else if err.is_connect() {
            AppError::Network("无法连接到服务器".to_string())
        } else {
            AppError::Network("网络请求失败".to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(_: serde_json::Error) -> Self {
        AppError::Unknown("JSON 解析失败".to_string())
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        match err {
            keyring::Error::NoEntry => AppError::Unknown("未找到凭据".to_string()),
            _ => AppError::Unknown("凭据管理器错误".to_string()),
        }
    }
}

/// 清理错误消息，移除可能的敏感信息
fn sanitize_error_message(msg: &str) -> String {
    // 移除可能包含的 API Key、Token 等敏感信息
    let patterns = [
        (r"(api[_-]?key|token|authorization)[:\s=]+[^\s]+", "[REDACTED]"),
        (r"Bearer\s+[^\s]+", "Bearer [REDACTED]"),
        (r"sk-[a-zA-Z0-9]+", "[REDACTED]"),
    ];
    
    let mut result = msg.to_string();
    for (pattern, replacement) in patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            result = re.replace_all(&result, replacement).to_string();
        }
    }
    
    // 限制错误消息长度
    if result.len() > 200 {
        result.truncate(197);
        result.push_str("...");
    }
    
    result
}

/// 将 AppError 转换为前端可用的字符串
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
