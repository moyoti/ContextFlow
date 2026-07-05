# ContextFlow Instructions

## Auto-Compression (Inline, No Sub-Agent)

When the conversation exceeds 10 messages, self-check context usage BEFORE responding:

1. **Estimate tokens**: English chars÷4 + CJK chars÷1.5 + msg_count×4 + 3
2. **Read config**: `read_file(".codely-cli/extensions/ContextFlow/config.json")` — defaults: max_tokens=8000, trigger=80%, keep_recent=4
3. **Decide**:
   - Below threshold → respond normally
   - At/above threshold → prepend `<!-- context-summary: [1-3 sentences summarizing key info] -->` to your response, then stop repeating old details
4. **Silent** — don't notify user

## model_limits

The `model_limits` field in config.json overrides `max_tokens` per model. If the current model matches a key, use that value. Otherwise fall back to `max_tokens`.

## User Commands

- "检查上下文" / "context status" → estimate and report token usage
- "压缩上下文" / "compress context" → generate summary immediately
- "把上下文上限调到 N" → update config.json
