import { describe, it, expect, beforeEach } from "vitest"
import { TtlCache } from "../lib/ttl-cache.js"

describe("TtlCache", () => {
  let cache: TtlCache<string>

  beforeEach(() => {
    cache = new TtlCache<string>(100) // 100ms TTL
  })

  it("stores and retrieves values", () => {
    cache.set("key1", "value1")
    expect(cache.get("key1")).toBe("value1")
  })

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined()
  })

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1")
    expect(cache.get("key1")).toBe("value1")

    await new Promise((r) => setTimeout(r, 150))
    expect(cache.get("key1")).toBeUndefined()
  })

  it("tracks size correctly", () => {
    cache.set("a", "1")
    cache.set("b", "2")
    expect(cache.size).toBe(2)
  })

  it("overwrites existing keys", () => {
    cache.set("key", "old")
    cache.set("key", "new")
    expect(cache.get("key")).toBe("new")
    expect(cache.size).toBe(1)
  })

  it("cleans up on destroy", () => {
    cache.set("a", "1")
    cache.destroy()
    expect(cache.size).toBe(0)
  })
})
