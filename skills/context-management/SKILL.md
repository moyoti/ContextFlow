---
name: context-management
description: ⚠️ MANDATORY AUTO-TRIGGER — This skill is ALWAYS active. When conversation exceeds 10 messages, the agent must self-check context usage and compress if needed. No sub-agent delegation required. Trigger keywords: any long conversation, "检查上下文", "compress context", "上下文窗口", "context window".
---

# ContextFlow — 上下文自动管理规则

## 自检流程（内联执行，不要委托子 Agent）

对话超过 10 条消息时，在回应前**内联执行**以下步骤：

### 1. 估算当前 Token 数

用以下规则快速心算：
- 英文/拉丁字符: **~4 字符 = 1 token**
- 中文/CJK 字符: **~1.5 字符 = 1 token**
- 每条消息额外: ~4 tokens
- 对话额外: ~3 tokens

**心算公式**: `总 token ≈ (英文字符数 ÷ 4) + (中文字符数 ÷ 1.5) + 消息数 × 4 + 3`

### 2. 读取阈值

读取 `.codely-cli/extensions/ContextFlow/config.json` 获取配置。如果文件不存在，使用默认值：
- `max_tokens`: 8000（兜底值）
- `trigger_percent`: 80
- `keep_recent`: 4
- `model_limits`: 按模型覆盖 max_tokens

### 3. 决策

- **Token < max_tokens × trigger_percent%** → 不压缩，正常回应
- **Token >= 阈值** → 执行压缩（步骤 4）
- **Token >= max_tokens × 95%** → 必须压缩，这是紧急情况

### 4. 压缩（内联执行）

当需要压缩时，在回应的最开头加一段不可见的压缩摘要：

```
<!-- context-summary: [用1-3句话概括之前对话的关键信息：用户目标、已做的决策、技术约束、未解决问题] -->
```

然后**不再重复**已被摘要覆盖的旧信息。自然地只基于摘要 + 最近 `keep_recent` 条消息继续对话。

### 压缩原则

- 用**对话相同语言**写摘要
- 保留：用户目标、关键决策、技术约束、未解决问题
- 丢弃：问候、闲聊、重复澄清、已解决的细节
- 摘要尽量**简短**（1-3 句话，不超过 200 字）
- **静默执行**：不通知用户，除非压缩失败

### 5. 更新配置（可选）

如果用户说"把上下文上限调到 XXX"或"配置上下文窗口"，直接读写 `.codely-cli/extensions/ContextFlow/config.json`。

## 配置格式

```json
{
  "max_tokens": 8000,
  "trigger_percent": 80,
  "keep_recent": 4,
  "auto_compress": true,
  "model_limits": {
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-3.5-turbo": 16385,
    "deepseek-chat": 65536
  }
}
```

- `max_tokens`: 兜底 token 上限
- `model_limits`: 当前模型匹配到 key 时，用该值替代 max_tokens
- `trigger_percent`: 达到此百分比时触发压缩
- `keep_recent`: 压缩时保留最近 N 条消息
