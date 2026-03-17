import { NextFunction, Request, Response } from "express";
import { getModels } from "../models/index.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawUserId = req.header("x-user-id")?.trim() ?? "";

    if (!rawUserId) {
      res.status(401).json({
        ok: false,
        error: {
          code: "AUTH_UNAUTHORIZED",
          message: "Missing x-user-id header",
        },
      });
      return;
    }

    if (!UUID_V4_REGEX.test(rawUserId)) {
      res.status(400).json({
        ok: false,
        error: {
          code: "AUTH_INVALID_USER_ID",
          message: "x-user-id must be a valid UUID",
        },
      });
      return;
    }

    const { User } = getModels();
    const user = await User.findByPk(rawUserId);

    if (!user) {
      res.status(401).json({
        ok: false,
        error: {
          code: "AUTH_UNAUTHORIZED",
          message: "Invalid authentication context",
        },
      });
      return;
    }

    req.authUserId = user.id;
    next();
  } catch {
    res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
      },
    });
  }
}
