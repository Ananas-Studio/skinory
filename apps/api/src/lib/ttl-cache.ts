// Simple in-memory TTL cache
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly ttlMs: number) {
    // Periodic cleanup every 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000)
    if (this.cleanupTimer.unref) this.cleanupTimer.unref()
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}
