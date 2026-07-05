---
name: context-management
description: ⚠️ MANDATORY AUTO-TRIGGER — This skill is ALWAYS active. When conversation exceeds 10 messages, use the contextflow MCP tools to check token usage and compress if needed. Trigger keywords: any long conversation, "检查上下文", "compress context", "上下文窗口", "context window".
---

# ContextFlow — 上下文自动管理规则

## 自检流程（内联执行，使用 MCP 工具，不要委托子 Agent）

对话超过 10 条消息时，在回应前**内联执行**：

### 1. 查询精确 Token 用量

调用 MCP 工具（**不要心算**）：

```
get_context_status
```

返回：`token_count`, `message_count`, `max_tokens`, `threshold`, `token_usage_ratio`, `should_compress`, `active_model`, `keep_recent`

### 2. 决策

- `should_compress == false` → 正常回应
- `should_compress == true` → 执行压缩（步骤 3）

### 3. 压缩（内联执行）

在回应开头加 HTML 注释摘要：

```html
<!-- context-summary: [1-3句概括关键信息：用户目标、已做决策、技术约束、未解决问题] -->
```

然后不再重复已被摘要覆盖的旧信息，自然地只基于摘要 + 最近 `keep_recent` 条消息继续对话。

### 压缩原则

- 用**对话相同语言**写摘要
- 保留：用户目标、关键决策、技术约束、未解决问题
- 丢弃：问候、闲聊、重复澄清、已解决的细节
- 摘要尽量**简短**（1-3 句话，不超过 200 字）
- **静默执行**：不通知用户

### 4. 修改配置（用户要求时）

调用 MCP 工具：

```
set_context_config(max_tokens=8000, trigger_percent=80, keep_recent=4, model_name="gpt-4o", model_token_limit=128000)
```

或手动计算特定文本的 token：

```
count_tokens(text="你好世界")
```

## MCP 工具一览

| 工具 | 功能 |
|------|------|
| `get_context_status` | 读取最新对话自动保存，精确计算 Token，判断是否需压缩 |
| `count_tokens` | 计算任意文本的 Token 数 |
| `set_context_config` | 修改配置（阈值、模型上限等） |
