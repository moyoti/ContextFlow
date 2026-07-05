import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(EXTENSION_ROOT, "config.json");
const AUTO_SAVES_DIR = path.join(EXTENSION_ROOT, "..", "..", "auto-saves");

// ─── Token estimation ───

function isCJK(c) {
  const code = c.codePointAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x3000 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

function countTokens(text) {
  if (!text) return 0;
  let latin = 0, cjk = 0;
  for (const c of text) {
    if (isCJK(c)) cjk++; else latin++;
  }
  return Math.ceil(latin / 4 + cjk / 1.5);
}

function countMessagesTokens(messages) {
  let total = 3; // conversation overhead
  for (const msg of messages) {
    const role = msg.role || "user";
    const text = msg.parts
      ? msg.parts.map(p => p.text || "").join("")
      : (msg.content || "");
    total += countTokens(role) + countTokens(text) + 4;
  }
  return total;
}

// ─── Config ───

const DEFAULT_CONFIG = {
  max_tokens: 8000,
  trigger_percent: 80,
  keep_recent: 4,
  auto_compress: true,
  model_limits: {}
};

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getEffectiveMaxTokens(config, model) {
  if (model && config.model_limits && config.model_limits[model]) {
    return config.model_limits[model];
  }
  return config.max_tokens;
}

// ─── Auto-saves ───

function getLatestAutoSave() {
  if (!fs.existsSync(AUTO_SAVES_DIR)) return null;
  const files = fs.readdirSync(AUTO_SAVES_DIR)
    .filter(f => f.startsWith("chat-auto-save-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(AUTO_SAVES_DIR, files[0]), "utf8"));
  } catch {
    return null;
  }
}

function extractMessages(autoSave) {
  if (!autoSave) return [];
  // clientHistory format (observed)
  if (autoSave.clientHistory) {
    return autoSave.clientHistory.filter(m => m.role === "user" || m.role === "model");
  }
  // conversationRecord.messages format
  if (autoSave.conversationRecord && autoSave.conversationRecord.messages) {
    return autoSave.conversationRecord.messages;
  }
  return [];
}

// ─── MCP Server ───

const server = new McpServer({ name: "contextflow", version: "1.0.0" });

server.tool(
  "get_context_status",
  "Get current conversation context status: token count, usage ratio, whether compression is needed. Reads the latest auto-save to count actual characters.",
  {},
  async () => {
    const config = readConfig();
    const autoSave = getLatestAutoSave();
    const messages = extractMessages(autoSave);
    const messageCount = messages.length;
    const tokenCount = countMessagesTokens(messages);

    // Try to detect current model from settings
    let activeModel = "";
    try {
      const settingsPath = path.join(EXTENSION_ROOT, "..", "..", "settings.json");
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        activeModel = settings.model || "";
      }
    } catch {}

    const effectiveMax = getEffectiveMaxTokens(config, activeModel);
    const threshold = Math.floor(effectiveMax * config.trigger_percent / 100);
    const shouldCompress = tokenCount >= threshold;
    const tokenRatio = effectiveMax > 0 ? tokenCount / effectiveMax : 0;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          token_count: tokenCount,
          message_count: messageCount,
          max_tokens: effectiveMax,
          threshold: threshold,
          token_usage_ratio: Math.round(tokenRatio * 1000) / 1000,
          should_compress: shouldCompress,
          trigger_percent: config.trigger_percent,
          keep_recent: config.keep_recent,
          active_model: activeModel || "(unknown)",
          auto_compress: config.auto_compress
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "count_tokens",
  "Count tokens for given text using CJK-aware estimation (English: ~4 chars/token, CJK: ~1.5 chars/token).",
  { text: z.string().describe("Text to count tokens for") },
  async ({ text }) => {
    const tokens = countTokens(text);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ tokens, char_count: text.length, cjk_chars: [...text].filter(isCJK).length })
      }]
    };
  }
);

server.tool(
  "set_context_config",
  "Update ContextFlow configuration. All parameters optional.",
  {
    max_tokens: z.number().optional().describe("Fallback max token limit"),
    trigger_percent: z.number().min(50).max(100).optional().describe("Compression trigger % (50-100)"),
    keep_recent: z.number().min(1).optional().describe("Messages to keep during compression"),
    auto_compress: z.boolean().optional().describe("Enable auto-compression"),
    model_name: z.string().optional().describe("Model name to set limit for"),
    model_token_limit: z.number().optional().describe("Token limit for the specified model")
  },
  async (params) => {
    const config = readConfig();
    if (params.max_tokens !== undefined) config.max_tokens = params.max_tokens;
    if (params.trigger_percent !== undefined) config.trigger_percent = params.trigger_percent;
    if (params.keep_recent !== undefined) config.keep_recent = params.keep_recent;
    if (params.auto_compress !== undefined) config.auto_compress = params.auto_compress;
    if (params.model_name && params.model_token_limit !== undefined) {
      if (!config.model_limits) config.model_limits = {};
      config.model_limits[params.model_name] = params.model_token_limit;
    }
    writeConfig(config);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: true, config }, null, 2)
      }]
    };
  }
);

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);
