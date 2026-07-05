# ContextFlow — LLM 上下文自动管理

ContextFlow 是一个 Tuanjie Cowork 扩展插件，自动监控对话上下文 Token 用量，在接近上限时智能压缩历史消息。

## 功能

- 🔄 **自动压缩**：对话 Token 达到阈值时自动触发摘要压缩
- 📊 **可配置上下文窗口**：支持按模型设定不同 Token 上限
- 🧠 **零外部依赖**：context-compressor 自己就是 LLM，用推理生成摘要，无需额外 API
- 🎯 **精准阈值**：默认 80% Token 使用率触发压缩，可自定义
- 🌐 **CJK 感知**：Token 估算区分中英文（中文 ~1.5 字符/token，英文 ~4 字符/token）

## 安装

```bash
codely extensions install https://github.com/moyoti/ContextFlow
```

安装后重启 Cowork 即可使用。

## 配置

编辑 `.codely-cli/extensions/ContextFlow/config.json`：

```json
{
  "max_tokens": 8000,
  "trigger_percent": 80,
  "keep_recent": 4,
  "auto_compress": true,
  "model_limits": {
    "astron-code-latest": 256000,
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4-turbo": 128000,
    "gpt-4": 8192,
    "gpt-3.5-turbo": 16385,
    "claude-3-opus": 200000,
    "claude-3-5-sonnet": 200000,
    "claude-3-haiku": 200000,
    "deepseek-chat": 65536,
    "deepseek-v3": 65536,
    "qwen-turbo": 131072,
    "qwen-plus": 131072
  }
}
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `max_tokens` | 8000 | 全局 Token 上限（兜底值） |
| `trigger_percent` | 80 | 触发压缩的百分比阈值 |
| `keep_recent` | 4 | 压缩时保留最近 N 条消息 |
| `auto_compress` | true | 是否启用自动压缩 |
| `model_limits` | 见上方 | 按模型区分的 Token 上限 |

## 工作原理

```
对话超过 10 条 → 主 Agent 委托 context-compressor
                        ↓
              context-compressor（自己就是 LLM）
              1. 读取 config.json 获取当前模型的 Token 上限
              2. 估算对话 Token 数
              3. 未达阈值 → 静默继续
              4. 达到阈值 → 生成摘要，保留最近 N 条消息
```

## 使用

**自动模式**（默认）：对话变长后自动检测并压缩，无需操作。

**手动命令**：
- "检查上下文" — 查看当前 Token 使用率
- "压缩上下文" — 立即压缩
- "把上下文上限调到 128000" — 修改配置

## 文件结构

```
ContextFlow/
├── gemini-extension.json      # 扩展清单
├── config.json                # 上下文窗口配置
├── README.md                  # 本文件
├── GEMINI.md                  # 模型持久上下文
├── agents/
│   └── context-compressor.toml  # 上下文压缩子 Agent
└── skills/
    └── context-management/
        └── SKILL.md             # 上下文管理技能文档
```

## 许可证

MIT
