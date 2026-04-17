import rateLimit from "express-rate-limit"
import type { Request, Response } from "express"

// Shared handler for rate limit exceeded
const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    ok: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    },
  })
}

// Global rate limiter: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler,
})

// Strict limiter for expensive endpoints (AI, scan, social): 10 requests per minute per IP
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler,
})

// Auth limiter: 20 requests per minute per IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler,
})
