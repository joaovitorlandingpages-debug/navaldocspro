import { z } from "zod";

export type AIProviderStatus = "online" | "offline" | "degraded" | "not_configured";

export interface AIProviderHealth {
  status: AIProviderStatus;
  latency: number;
  lastUsed?: Date;
  lastError?: string;
  version?: string;
  model: string;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  stop?: string[];
  user?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };
  metadata?: Record<string, any>;
}

export interface AIProvider {
  id: string;
  name: string;
  initialize(): Promise<void>;
  healthCheck(): Promise<AIProviderHealth>;
  generate(prompt: string, options?: AIRequestOptions): Promise<AIResponse>;
  stream(prompt: string, options?: AIRequestOptions): AsyncIterable<string>;
  countTokens(text: string): Promise<number>;
  estimateCost(tokens: { prompt: number; completion: number }): Promise<number>;
  supportsStreaming(): boolean;
  supportsVision(): boolean;
  supportsFunctionCalling(): boolean;
  supportsJsonMode(): boolean;
  shutdown(): Promise<void>;
}

export const ProviderConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  model: z.string(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  options: z.any().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
