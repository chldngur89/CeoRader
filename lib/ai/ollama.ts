const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

const memoryCache = new Map<string, { data: any; expiry: number }>();

function getFromCache(key: string): any | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function saveToCache(key: string, data: any, ttlSeconds: number = 3600): void {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaClient {
  private host: string;
  private defaultOptions = {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_predict: 2048,
  };

  constructor(host: string = OLLAMA_HOST) {
    this.host = host;
  }

  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    const cacheKey = this.generateCacheKey(request);
    
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        options: { ...this.defaultOptions, ...request.options },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    saveToCache(cacheKey, data);
    
    return data;
  }

  async chat(messages: Array<{role: string; content: string}>, model: string = 'llama3.1:70b'): Promise<string> {
    const cacheKey = `chat:${model}:${JSON.stringify(messages)}`;
    
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: this.defaultOptions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';
    saveToCache(cacheKey, content, 3600);
    
    return content;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.host}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  }

  async pullModel(model: string): Promise<void> {
    const response = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${model}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private generateCacheKey(request: OllamaRequest): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(`${request.model}:${request.prompt}`).digest('hex');
    return `ollama:${hash}`;
  }
}

export const ollama = new OllamaClient();
