# ContextFlow Instructions

## Auto-Compression (Inline, Use MCP Tools)

When the conversation exceeds 10 messages, self-check context usage BEFORE responding:

1. **Call `get_context_status`** — reads the latest auto-save, counts actual characters, returns precise token estimate
2. **If `should_compress` is true** → prepend `<!-- context-summary: [1-3 sentences summarizing key info] -->` to your response, then stop repeating old details
3. **Silent** — don't notify user

## MCP Tools Available

- `get_context_status` — precise token count from auto-save data, no guessing
- `count_tokens(text)` — count tokens for any text
- `set_context_config(...)` — update config (max_tokens, trigger_percent, keep_recent, model_name + model_token_limit)

## model_limits

Config field `model_limits` overrides `max_tokens` per model. Example: `{"gpt-4o": 128000}`. If current model matches a key, that value is used; otherwise falls back to `max_tokens`.
