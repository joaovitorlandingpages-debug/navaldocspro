import { 
  AIProvider, 
  AIRequestOptions, 
  AIResponse, 
  AIProviderHealth 
} from "./provider-types";
import { providerRegistry } from "./provider-registry";

export class AIProviderManager {
  private defaultProviderId = "mock";
  private fallbackProviderId = "mock";

  async initialize(): Promise<void> {
    const providers = providerRegistry.list();
    await Promise.all(providers.map(p => p.initialize()));
  }

  async generate(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    const providerId = this.selectProvider(prompt, options);
    const provider = providerRegistry.get(providerId) || providerRegistry.get("mock")!;

    try {
      return await provider.generate(prompt, options);
    } catch (error) {
      console.error(`Provider ${providerId} failed, falling back...`, error);
      const fallback = providerRegistry.get(this.fallbackProviderId)!;
      return await fallback.generate(prompt, options);
    }
  }

  private selectProvider(prompt: string, options?: AIRequestOptions): string {
    // Dynamic selection logic
    if (prompt.length > 20000) return "claude";
    if (prompt.toLowerCase().includes("imagem") || options?.temperature === 0) return "openai";
    return this.defaultProviderId;
  }

  async getHealthReport(): Promise<Record<string, AIProviderHealth>> {
    const report: Record<string, AIProviderHealth> = {};
    const providers = providerRegistry.list();
    
    for (const p of providers) {
      report[p.id] = await p.healthCheck();
    }
    
    return report;
  }

  async shutdown(): Promise<void> {
    const providers = providerRegistry.list();
    await Promise.all(providers.map(p => p.shutdown()));
  }
}

export const aiProviderManager = new AIProviderManager();
