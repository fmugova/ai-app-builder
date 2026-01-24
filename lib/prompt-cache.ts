/**
 * Prompt caching system for faster regeneration
 */

interface CachedPrompt {
  code: string;
  timestamp: number;
  projectId?: string;
}

class PromptCache {
  private cache = new Map<string, CachedPrompt>();
  private readonly TTL = 1000 * 60 * 60; // 1 hour
  private readonly MAX_SIZE = 100;

  private normalize(prompt: string): string {
    return prompt
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 500); // Only cache first 500 chars for matching
  }

  get(prompt: string): string | null {
    const normalized = this.normalize(prompt);
    const cached = this.cache.get(normalized);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(normalized);
      return null;
    }

    console.log('✅ Cache hit for prompt:', prompt.substring(0, 50));
    return cached.code;
  }

  set(prompt: string, code: string, projectId?: string): void {
    const normalized = this.normalize(prompt);

    // Enforce max size
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(normalized, {
      code,
      timestamp: Date.now(),
      projectId,
    });

    console.log('💾 Cached prompt:', prompt.substring(0, 50));
  }

  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL,
    };
  }
}

export const promptCache = new PromptCache();