import type { Request, Response, NextFunction } from "express"
import { Semaphore } from "../lib/semaphore.js"

// Global semaphore for image processing: max 3 concurrent
const imageSemaphore = new Semaphore(3)

export function concurrencyGuard() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (imageSemaphore.pending > 10) {
      res.status(503).json({
        ok: false,
        error: {
          code: "CONCURRENCY_LIMIT",
          message: "Server is busy processing other requests. Please try again shortly.",
        },
      })
      return
    }

    await imageSemaphore.acquire()
    res.on("finish", () => imageSemaphore.release())
    next()
  }
}
