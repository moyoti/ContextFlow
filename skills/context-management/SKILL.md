---
name: context-management
description: ⚠️ MANDATORY AUTO-TRIGGER — This skill is ALWAYS active. At the START of EVERY conversation turn with >10 messages, the main agent MUST delegate to context-compressor to check if context needs compression. Context management with configurable token limits and auto-compression via summarization. The context-compressor agent uses its OWN LLM reasoning to summarize — no external API required. Trigger keywords: any conversation turn with >10 messages, "检查上下文", "context status", "压缩上下文", "compress context", "上下文窗口", "context window". NEVER wait for user to ask — proactive monitoring is REQUIRED.
---

> ⚠️ **核心规则 — 自动上下文管理（对所有 Agent 强制生效）**
>
> 1. **每次回应前检查**：对话超过 10 条消息时，主 Agent **必须**在回应前先委托 context-compressor 子 Agent 检查。
> 2. **发现需压缩时**：子 Agent 直接生成摘要并返回压缩后的上下文，不询问用户。
> 3. **静默执行**：压缩成功时不向用户报告，除非用户主动询问。
> 4. **不需要外部 API**：context-compressor 自己就是 LLM，用自己的推理能力生成摘要。

> ⚠️ **执行约束**
> - **主 agent**：必须 `task(subagent_name="context-compressor", ...)` 委托。委托时传入当前对话的关键信息。
> - **子 agent（本文档主要读者）**：按下方流程执行。

# ContextFlow — LLM 自动上下文管理 📊

自动监控 LLM 对话上下文 Token 用量，在接近上限时生成摘要压缩。

## 核心原理

context-compressor 自己就是一个 LLM。它不需要调用外部 API 来生成摘要——它用自己的推理能力来总结对话历史。

## 🚦 主 Agent 委托方式

对话超过 10 条消息后，在主 Agent 回应前执行：

```
task(
  subagent_name="context-compressor",
  description="auto context check",
  prompt="Review this conversation. Current approximate length: [N] messages.
Key topics discussed: [brief summary of what's been discussed].
Please check if context needs compression, and if so, provide the compressed summary."
)
```

## 🚦 子 Agent 执行流程

### 1. 估算 Token 数

- 英文/拉丁字符: ~4 字符 = 1 token
- 中文/CJK 字符: ~1.5 字符 = 1 token  
- 每条消息额外: ~4 tokens（角色标记、格式化）
- 对话额外: ~3 tokens

### 2. 读取配置

```
read_file(".codely-cli/extensions/ContextFlow/config.json")
```

如果文件不存在，创建默认配置：
```json
{"max_tokens": 8000, "trigger_percent": 80, "keep_recent": 4, "auto_compress": true}
```

### 3. 决策

- Token < `max_tokens * trigger_percent / 100` → 不压缩，简短报告即可
- Token >= 阈值 → 执行压缩

### 4. 压缩（仅在需要时）

1. **保留**最近 `keep_recent` 条消息不变
2. **总结**所有更早的消息为一个简洁摘要
3. 摘要语言跟对话语言一致
4. 保留：用户目标、关键决策、技术约束、未解决问题
5. 丢弃：问候语、闲聊、重复澄清

### 5. 输出格式

```
## Context Status
Total tokens: ~XXXX / YYYY (threshold: ZZZZ)
Decision: NO COMPRESSION NEEDED | COMPRESSING...

[如果需要压缩:]
## Compressed Summary
[摘要内容]

## Recent Messages (preserved)
[保留的最近N条消息]
```

### 6. 记录日志（可选）

追加到 `compression_log.jsonl`:
```json
{"timestamp": "...", "tokens_before": X, "tokens_after": Y, "messages_before": M, "messages_after": N}
```

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| max_tokens | 8000 | 全局 Token 上限（兜底值） |
| trigger_percent | 80 | 触发压缩的百分比阈值 |
| keep_recent | 4 | 压缩时保留最近 N 条消息 |
| auto_compress | true | 是否启用自动压缩 |
| model_limits | 见 config.json | 按模型区分的 Token 上限，匹配到则覆盖 max_tokens |

model_limits 示例：
```json
{"astron-code-latest": 256000, "gpt-4o": 128000, "claude-3-5-sonnet": 200000}
```
