import { 
  AIProvider, 
  AIProviderHealth, 
  AIRequestOptions, 
  AIResponse 
} from "./provider-types";

export class MockProvider implements AIProvider {
  id = "mock";
  name = "Mock Provider";
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async healthCheck(): Promise<AIProviderHealth> {
    return {
      status: "online",
      latency: 5,
      model: "mock-v1",
      lastUsed: new Date()
    };
  }

  async generate(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    return {
      content: `[Mock Response to: ${prompt.substring(0, 50)}...]`,
      model: "mock-v1",
      provider: "mock",
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: 20,
        totalTokens: (prompt.length / 4) + 20,
        estimatedCost: 0
      }
    };
  }

  async *stream(prompt: string, options?: AIRequestOptions): AsyncIterable<string> {
    const response = `[Mock Streamed Response to: ${prompt.substring(0, 20)}...]`;
    for (const char of response) {
      yield char;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async estimateCost(tokens: { prompt: number; completion: number }): Promise<number> {
    return 0;
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return false; }
  supportsFunctionCalling(): boolean { return false; }
  supportsJsonMode(): boolean { return true; }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
