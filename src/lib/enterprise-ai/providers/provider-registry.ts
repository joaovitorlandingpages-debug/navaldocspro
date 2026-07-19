import { AIProvider } from "./provider-types";
import { MockProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import { ClaudeProvider } from "./claude-provider";

class ProviderRegistry {
  private providers = new Map<string, AIProvider>();

  register(provider: AIProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();

// Auto-register default providers
providerRegistry.register(new MockProvider());
providerRegistry.register(new OpenAIProvider());
providerRegistry.register(new GeminiProvider());
providerRegistry.register(new ClaudeProvider());
