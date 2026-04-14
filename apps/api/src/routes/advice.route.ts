import { Response, Router } from "express";
import { ZodError, z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkUsage, recordUsageFromReq } from "../middlewares/usage.middleware.js";
import {
  createSession,
  getSessionMessages,
  listSessions,
  sendMessageAndStream,
  toPublicError,
} from "../services/advice.service.js";

const adviceRouter = Router();

const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

function respondAdviceError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "ADVICE_VALIDATION_FAILED",
        message: "Invalid request body",
        details: error.flatten(),
      },
    });
    return;
  }

  const publicError = toPublicError(error);
  res.status(publicError.status).json({
    ok: false,
    error: {
      code: publicError.code,
      message: publicError.message,
      details: publicError.details,
    },
  });
}

const createSessionBodySchema = z.object({
  productId: z.string().uuid().optional(),
}).optional();

adviceRouter.post("/sessions", requireAuth, async (req, res) => {
  try {
    const body = createSessionBodySchema.parse(req.body);
    const result = await createSession(req.authUserId as string, body?.productId);

    res.status(201).json({
      ok: true,
      data: result,
    });
  } catch (error: unknown) {
    respondAdviceError(res, error);
  }
});

adviceRouter.get("/sessions", requireAuth, async (req, res) => {
  try {
    const result = await listSessions(req.authUserId as string);

    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error: unknown) {
    respondAdviceError(res, error);
  }
});

adviceRouter.get("/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const result = await getSessionMessages(sessionId, req.authUserId as string);

    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error: unknown) {
    respondAdviceError(res, error);
  }
});

adviceRouter.post("/sessions/:sessionId/messages", requireAuth, checkUsage("ai_advice"), async (req, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const userId = req.authUserId as string;
    const body = sendMessageBodySchema.parse(req.body);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      await sendMessageAndStream(
        sessionId,
        userId,
        body.content,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        },
        async (fullContent) => {
          await recordUsageFromReq(req);
          res.write(`data: ${JSON.stringify({ type: "done", content: fullContent })}\n\n`);
          res.end();
        },
        (error) => {
          res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
          res.end();
        }
      );
    } catch (streamError: unknown) {
      const msg = streamError instanceof Error ? streamError.message : "Unexpected error";
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
      res.end();
    }
  } catch (error: unknown) {
    if (!res.headersSent) {
      respondAdviceError(res, error);
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Unexpected error" })}\n\n`);
      res.end();
    }
  }
});

export { adviceRouter };
