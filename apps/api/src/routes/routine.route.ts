import { Response, Router } from "express"
import { ZodError, z } from "zod"
import { ROUTINE_STEP_CATEGORIES } from "@skinory/core"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  addStep,
  generateRoutine,
  getRoutines,
  removeStep,
  toPublicError,
} from "../services/routine.service.js"

const routineRouter = Router()

// ─── Schemas ─────────────────────────────────────────────────────────────────

const addStepSchema = z.object({
  routineId: z.string().uuid(),
  productId: z.string().uuid(),
  category: z.enum(ROUTINE_STEP_CATEGORIES as unknown as [string, ...string[]]),
})

// ─── Error handler ───────────────────────────────────────────────────────────

function respondRoutineError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "ROUTINE_VALIDATION_FAILED",
        message: "Invalid request body",
        details: error.flatten(),
      },
    })
    return
  }

  const publicError = toPublicError(error)
  res.status(publicError.status).json({
    ok: false,
    error: {
      code: publicError.code,
      message: publicError.message,
      details: publicError.details,
    },
  })
}

// ─── GET /routine ────────────────────────────────────────────────────────────

routineRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const routines = await getRoutines(userId)

    res.status(200).json({ ok: true, data: routines })
  } catch (error: unknown) {
    respondRoutineError(res, error)
  }
})

// ─── POST /routine/generate ──────────────────────────────────────────────────

routineRouter.post("/generate", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const result = await generateRoutine(userId)

    res.status(201).json({ ok: true, data: result })
  } catch (error: unknown) {
    respondRoutineError(res, error)
  }
})

// ─── POST /routine/steps ─────────────────────────────────────────────────────

routineRouter.post("/steps", requireAuth, async (req, res) => {
  try {
    const body = addStepSchema.parse(req.body)
    const userId = req.authUserId as string

    const step = await addStep(userId, body.routineId, body.productId, body.category as any)

    res.status(201).json({ ok: true, data: step })
  } catch (error: unknown) {
    respondRoutineError(res, error)
  }
})

// ─── DELETE /routine/steps/:stepId ───────────────────────────────────────────

routineRouter.delete("/steps/:stepId", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const stepId = req.params.stepId as string

    await removeStep(userId, stepId)

    res.status(200).json({ ok: true, data: null })
  } catch (error: unknown) {
    respondRoutineError(res, error)
  }
})

export { routineRouter }
