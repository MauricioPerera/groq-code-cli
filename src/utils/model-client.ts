import Groq from 'groq-sdk';
import { ConfigManager } from './local-settings.js';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
};

type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type ChatResponse = {
  choices: Array<{ message: any; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export type ProviderKind = 'groq' | 'openai';

export class ModelClient {
  private kind: ProviderKind;
  private groq: Groq | null = null;
  private baseUrl: string | null = null;
  private apiKey: string | null = null;

  constructor(kind: ProviderKind, options: { apiKey?: string; baseUrl?: string }) {
    this.kind = kind;
    if (kind === 'groq') {
      if (!options.apiKey) throw new Error('Missing GROQ API key');
      this.groq = new Groq({ apiKey: options.apiKey });
    } else {
      if (!options.apiKey) throw new Error('Missing OpenAI-compatible API key');
      this.apiKey = options.apiKey;
      this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    }
  }

  public getKind(): ProviderKind { return this.kind; }

  public getBaseUrl(): string | null { return this.baseUrl; }

  async createChatCompletion(req: ChatRequest, abortSignal?: AbortSignal): Promise<ChatResponse> {
    if (this.kind === 'groq') {
      if (!this.groq) throw new Error('Groq client not initialized');
      const res = await this.groq.chat.completions.create({
        model: req.model,
        messages: req.messages as any,
        tools: req.tools,
        tool_choice: req.tool_choice as any,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        stream: req.stream,
      }, { signal: abortSignal });
      return res as any;
    }

    // OpenAI-compatible HTTP
    const url = `${this.baseUrl}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req),
      signal: abortSignal,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw Object.assign(new Error(`API Error (${resp.status}): ${txt || resp.statusText}`), { status: resp.status, error: { error: { message: txt } } });
    }
    const json = await resp.json();
    return json as ChatResponse;
  }
}

export function createModelClient(config: ConfigManager): ModelClient {
  // Environment overrides first
  const openaiKey = process.env.OPENAI_API_KEY;
  const openaiUrl = process.env.OPENAI_BASE_URL;
  if (openaiKey) {
    return new ModelClient('openai', { apiKey: openaiKey, baseUrl: openaiUrl || undefined });
  }

  // Config file OpenAI
  const openaiCfg = config.getOpenAIConfig();
  if (openaiCfg.apiKey) {
    return new ModelClient('openai', { apiKey: openaiCfg.apiKey, baseUrl: openaiCfg.baseUrl });
  }

  // Default to Groq using config/env
  const groqKey = process.env.GROQ_API_KEY || config.getApiKey() || '';
  if (!groqKey) throw new Error('No API key available. Use /login or set OPENAI_API_KEY/GROQ_API_KEY.');
  return new ModelClient('groq', { apiKey: groqKey });
}


