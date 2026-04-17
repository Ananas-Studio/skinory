import { NextFunction, Request, Response } from "express"
import type { UsageCategory } from "@skinory/core"
import { checkAndRecordUsage } from "../services/usage.service.js"

// ─── Usage Check Middleware ──────────────────────────────────────────────────
// Atomically checks the monthly limit AND records usage in a single operation.

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

      await checkAndRecordUsage(userId, category)
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

// Kept for backward compatibility — usage is now recorded atomically in checkUsage
export async function recordUsageFromReq(_req: Request): Promise<void> {
  // No-op: usage is now recorded atomically in checkAndRecordUsage
}
