import { NextFunction, Request, Response } from "express"
import type { UsageCategory } from "@skinory/core"
import { checkLimit, recordUsage } from "../services/usage.service.js"

// ─── Usage Check Middleware ──────────────────────────────────────────────────
// Validates usage limit BEFORE the handler runs.
// If within limit, attaches a helper to record usage after success.

export function checkUsage(category: UsageCategory) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authUserId
      if (!userId) {
        res.status(401).json({
          ok: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Missing auth context" },
        })
        return
      }

      await checkLimit(userId, category)

      // Attach helper so the route handler can record usage on success
      ;(req as unknown as Record<string, unknown>)._recordUsage = async (metadata?: Record<string, unknown>) => {
        await recordUsage(userId, category, metadata)
      }

      next()
    } catch (err: unknown) {
      const e = err as { statusCode?: number; code?: string; message?: string }
      if (e.code === "USAGE_LIMIT_EXCEEDED") {
        res.status(e.statusCode ?? 403).json({
          ok: false,
          error: {
            code: "USAGE_LIMIT_EXCEEDED",
            message: e.message ?? "Monthly usage limit reached",
          },
        })
        return
      }
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error" },
      })
    }
  }
}

// ─── Helper to call from route handlers ──────────────────────────────────────

export async function recordUsageFromReq(req: Request): Promise<void> {
  const fn = (req as unknown as Record<string, unknown>)._recordUsage as
    | ((meta?: Record<string, unknown>) => Promise<void>)
    | undefined
  if (fn) await fn()
}
