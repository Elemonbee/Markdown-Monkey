export type Lang = 'zh-CN' | 'en-US'

const dict: Record<Lang, Record<string, string>> = {
  'zh-CN': {
    open: '打开',
    open_folder: '打开文件夹',
    save: '保存',
    save_as: '另存为',
    settings: '设置',
    export_html: '导出HTML',
    export_pdf: '导出PDF',
    ai_enabled: 'AI 已启用',
    enable_ai: '启用 AI',
    ai_chat: 'AI 对话',
    reset_position: '重置',
    show_outline: '显示大纲',
    hide_outline: '隐藏大纲',
    tab_outline: '大纲',
    tab_files: '文件',
    new_file: '新建',
    refresh: '刷新',
    rename: '重命名',
    remove: '删除',
    copy_path: '复制路径',
    close_others: '关闭其他',
    close_right: '关闭右侧',
    locate_in_tree: '在文件树定位'
    , search_replace: '搜索/替换'
    , close_search: '关闭搜索'
    , search_placeholder: '查找...'
    , replace_placeholder: '替换为...'
    , regex: '正则'
    , case_insensitive: '忽略大小写'
    , search_btn: '查找'
    , prev: '上一个'
    , next: '下一个'
    , replace: '替换'
    , replace_all: '全部替换'
    , settings_title: '设置'
    , close: '关闭'
    , tab_ui: '界面设置'
    , tab_ai: 'AI 设置'
    , tab_templates: '提示模板'
    , recent_files_label: '最近文件：'
    , open_label: '打开'
    , clear_recent: '清空最近文件'
    , editor_font_size: '编辑器字号'
    , preview_font_size: '预览字号'
    , language: '界面语言'
    , theme: '主题'
    , theme_dark: '暗色'
    , theme_light: '亮色'
    , theme_system: '跟随系统'
    , test_connection: '测试连接'
    , save_btn: '保存'
    , enter_api_key: '请先在设置中填写有效的 API Key。'
    , model_list_label: '模型列表'
    , get_models_btn: '获取模型列表'
    , select_model_placeholder: '选择模型...'
    , loading_text: '获取中...'
    , placeholder_guide: '占位符说明：'
    , ph_text: '• 文本：{text} → 选区内容；若模板“作用域”是全文，则为全文内容'
    , ph_lang: '• 语言：{lang} → 模板中的语言变量值（如 zh-CN / en-US）'
    , ph_style: '• 风格：{style} → 模板中的风格变量值（如 简洁 / 正式）'
    , ph_date: '• 日期：{date} → 当前日期（yyyy-mm-dd）'
    , ph_filename: '• 文件名：{filename} → 当前文件名'
    , ph_model: '• 模型：{model}，提供商：{provider}'
    , custom_templates_hint: '自定义模板（使用 {text} 作为选中文本/全文占位符）：'
    , title_label_i18n: '标题'
    , scope_label_i18n: '作用域'
    , prompt_label_i18n: '提示词'
    , vars_label_i18n: '变量'
    , enabled_label_i18n: '启用'
    , scope_selection: '选中'
    , scope_document: '全文'
    , new_template_btn: '+ 新建模板'
    , export_templates_btn: '导出模板'
    , import_templates_btn: '导入模板'
    , delete_btn: '删除'
    , clear_recents_confirm: '清空最近文件'
    , words: '字数'
    , chars: '字符'
    , read_time: '阅读时长'
    , unsaved: '未保存文件'
    , ai_menu_title: '选择要出现在右键菜单中的 AI 动作：'
    , continue_sel: '续写（选中）'
    , continue_doc: '续写（全文）'
    , rewrite_sel: '改写（选中）'
    , translate_zh_sel: '翻译为中文（选中）'
    , translate_en_sel: '翻译为英文（选中）'
    , summary_sel: '总结要点（选中）'
    , summary_doc: '总结要点（全文）'
    , provider: '提供商'
    , api_base_url: 'API 基础地址'
    , api_key: 'API Key'
    , model_label: '模型'
    , system_prompt_label: '系统提示词'
    , temperature_label: '温度'
    , base_url_ph_openai: 'https://api.openai.com'
    , base_url_ph_ollama: 'http://127.0.0.1:11434'
    , api_key_ph_required: '必填'
    , api_key_ph_ollama: 'Ollama 无需 Key'
    , model_ph_openai: '例如 openrouter 的模型 ID'
    , model_ph_ollama: '例如 llama3'
    , system_prompt_placeholder: '你是一个有帮助的 Markdown 写作助手。'
    , temperature_placeholder: '0.7'
    , minimize: '最小化'
    , expand: '展开'
    , minimized: '最小化'
    , start_chat: '开始与 AI 对话…'
    , type_message_placeholder: '输入消息。回车发送，Shift+Enter 换行。'
    , cancel: '取消'
    , send: '发送'
    , insert_to_editor: '插入到编辑器'
    , export: '导出'
    , clear: '清空'
    , error_prefix: '错误：'
    , you: '你'
    , ai_label: 'AI'
    , var_lang_ph: 'lang（如 zh-CN/en-US）'
    , var_style_ph: 'style（如 concise/formal）'
    , pdf_success: '已导出 PDF 到：'
    , pdf_failed: '导出 PDF 失败：'
    , auto_scroll_on: '自动滚动：开'
    , auto_scroll_off: '自动滚动：关'
    , fullscreen: '全屏'
    , exit_fullscreen: '退出全屏'
    , processing_hint: '处理中… 可点击“取消”停止显示。'
    , resize_hint: '可拖动右下角改变大小'
    , copy: '复制'
    , copy_md: '复制为 Markdown'
    , copy_code: '复制为代码块'
    , regenerate: '重新生成'
  },
  'en-US': {
    open: 'Open',
    open_folder: 'Open Folder',
    save: 'Save',
    save_as: 'Save As',
    settings: 'Settings',
    export_html: 'Export HTML',
    export_pdf: 'Export PDF',
    ai_enabled: 'AI Enabled',
    enable_ai: 'Enable AI',
    ai_chat: 'AI Chat',
    reset_position: 'Reset',
    show_outline: 'Show Outline',
    hide_outline: 'Hide Outline',
    tab_outline: 'Outline',
    tab_files: 'Files',
    new_file: 'New',
    refresh: 'Refresh',
    rename: 'Rename',
    remove: 'Delete',
    copy_path: 'Copy Path',
    close_others: 'Close Others',
    close_right: 'Close Right',
    locate_in_tree: 'Reveal in Tree'
    , search_replace: 'Search/Replace'
    , close_search: 'Close Search'
    , search_placeholder: 'Search...'
    , replace_placeholder: 'Replace with...'
    , regex: 'Regex'
    , case_insensitive: 'Ignore Case'
    , search_btn: 'Find'
    , prev: 'Prev'
    , next: 'Next'
    , replace: 'Replace'
    , replace_all: 'Replace All'
    , settings_title: 'Settings'
    , close: 'Close'
    , tab_ui: 'UI'
    , tab_ai: 'AI'
    , tab_templates: 'Templates'
    , recent_files_label: 'Recent Files:'
    , open_label: 'Open'
    , clear_recent: 'Clear Recents'
    , editor_font_size: 'Editor Font Size'
    , preview_font_size: 'Preview Font Size'
    , language: 'Language'
    , theme: 'Theme'
    , theme_dark: 'Dark'
    , theme_light: 'Light'
    , theme_system: 'System'
    , test_connection: 'Test Connection'
    , save_btn: 'Save'
    , enter_api_key: 'Please enter a valid API Key in Settings first.'
    , model_list_label: 'Models'
    , get_models_btn: 'Get Models'
    , select_model_placeholder: 'Select model...'
    , loading_text: 'Loading...'
    , placeholder_guide: 'Placeholders:'
    , ph_text: '• text: {text} → selection; when scope is document, it is the whole content'
    , ph_lang: '• lang: {lang} → language variable (e.g. zh-CN / en-US)'
    , ph_style: '• style: {style} → style variable (e.g. concise / formal)'
    , ph_date: '• date: {date} → today (yyyy-mm-dd)'
    , ph_filename: '• filename: {filename} → current filename'
    , ph_model: '• model: {model}, provider: {provider}'
    , custom_templates_hint: 'Custom templates (use {text} as selection/document placeholder):'
    , title_label_i18n: 'Title'
    , scope_label_i18n: 'Scope'
    , prompt_label_i18n: 'Prompt'
    , vars_label_i18n: 'Variables'
    , enabled_label_i18n: 'Enabled'
    , scope_selection: 'Selection'
    , scope_document: 'Document'
    , new_template_btn: '+ New Template'
    , export_templates_btn: 'Export'
    , import_templates_btn: 'Import'
    , delete_btn: 'Delete'
    , clear_recents_confirm: 'Clear Recents'
    , words: 'Words'
    , chars: 'Chars'
    , read_time: 'Read Time'
    , unsaved: 'Unsaved'
    , ai_menu_title: 'Choose AI actions to show in context menu:'
    , continue_sel: 'Continue (selection)'
    , continue_doc: 'Continue (document)'
    , rewrite_sel: 'Rewrite (selection)'
    , translate_zh_sel: 'Translate to Chinese (selection)'
    , translate_en_sel: 'Translate to English (selection)'
    , summary_sel: 'Summarize (selection)'
    , summary_doc: 'Summarize (document)'
    , provider: 'Provider'
    , api_base_url: 'API Base URL'
    , api_key: 'API Key'
    , model_label: 'Model'
    , system_prompt_label: 'System Prompt'
    , temperature_label: 'Temperature'
    , base_url_ph_openai: 'https://api.openai.com'
    , base_url_ph_ollama: 'http://127.0.0.1:11434'
    , api_key_ph_required: 'Required'
    , api_key_ph_ollama: 'Ollama does not require a key'
    , model_ph_openai: 'e.g. openrouter model id'
    , model_ph_ollama: 'e.g. llama3'
    , system_prompt_placeholder: 'You are a helpful assistant for markdown writing.'
    , temperature_placeholder: '0.7'
    , minimize: 'Minimize'
    , expand: 'Expand'
    , minimized: 'Minimized'
    , start_chat: 'Start a conversation with AI…'
    , type_message_placeholder: 'Type a message. Enter to send, Shift+Enter for newline.'
    , cancel: 'Cancel'
    , send: 'Send'
    , insert_to_editor: 'Insert to Editor'
    , export: 'Export'
    , clear: 'Clear'
    , error_prefix: 'Error:'
    , you: 'You'
    , ai_label: 'AI'
    , var_lang_ph: 'lang (e.g. zh-CN/en-US)'
    , var_style_ph: 'style (e.g. concise/formal)'
    , pdf_success: 'Exported PDF to: '
    , pdf_failed: 'Failed to export PDF: '
    , auto_scroll_on: 'Auto Scroll: On'
    , auto_scroll_off: 'Auto Scroll: Off'
    , fullscreen: 'Fullscreen'
    , exit_fullscreen: 'Exit Fullscreen'
    , processing_hint: 'Processing... You can click Cancel to stop displaying.'
    , resize_hint: 'You can drag to resize.'
    , copy: 'Copy'
    , copy_md: 'Copy as Markdown'
    , copy_code: 'Copy as Code Block'
    , regenerate: 'Regenerate'
  }
}

export function t(lang: Lang | string, key: string): string {
  const useLang: Lang = (lang === 'en-US' || lang === 'zh-CN') ? lang : 'zh-CN'
  return (dict[useLang] && dict[useLang][key]) || dict['zh-CN'][key] || key
}


