import { describe, it, expect } from "vitest"
import { Semaphore } from "../lib/semaphore.js"

describe("Semaphore", () => {
  it("allows up to max concurrent operations", async () => {
    const sem = new Semaphore(2)
    const running: number[] = []
    let maxConcurrent = 0

    const task = async (id: number) => {
      await sem.acquire()
      running.push(id)
      maxConcurrent = Math.max(maxConcurrent, running.length)
      await new Promise((r) => setTimeout(r, 50))
      running.splice(running.indexOf(id), 1)
      sem.release()
    }

    await Promise.all([task(1), task(2), task(3), task(4)])
    expect(maxConcurrent).toBe(2)
  })

  it("run() acquires and releases correctly", async () => {
    const sem = new Semaphore(1)
    const results: number[] = []

    await Promise.all([
      sem.run(async () => {
        results.push(1)
        await new Promise((r) => setTimeout(r, 30))
      }),
      sem.run(async () => {
        results.push(2)
      }),
    ])

    expect(results).toEqual([1, 2])
    expect(sem.running).toBe(0)
    expect(sem.pending).toBe(0)
  })

  it("releases on error", async () => {
    const sem = new Semaphore(1)

    await expect(
      sem.run(async () => {
        throw new Error("fail")
      }),
    ).rejects.toThrow("fail")

    expect(sem.running).toBe(0)
  })
})
