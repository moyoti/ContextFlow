# ContextFlow Instructions

You have access to the context-compressor sub-agent for managing conversation context.

## Auto-Compression Rule

When the conversation exceeds 10 messages, delegate to context-compressor before responding:

```
task(subagent_name="context-compressor", description="auto context check", prompt="Review this conversation for context overflow. [include message count and topic summary]. Check config.json for thresholds. Compress if needed.")
```

- Do this silently — don't notify the user unless compression fails
- Don't ask permission — just do it
- The compressor uses its own LLM reasoning to summarize, no external API needed

## Configuration

Edit `.codely-cli/extensions/ContextFlow/config.json` to adjust:
- `max_tokens`: token limit (fallback if no model match)
- `model_limits`: per-model token limits (e.g. "astron-code-latest": 256000)
- `trigger_percent`: compress at this % of limit (default 80)
- `keep_recent`: preserve last N messages during compression (default 4)
