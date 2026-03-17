import { Response, Router } from "express";
import { ZodError, z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
	addConnection,
	getMe,
	listConnections,
	removeConnection,
	signInWithProvider,
	signOut,
	toPublicError,
} from "../services/auth.service.js";

const authRouter = Router();

const signInBodySchema = z.object({
	provider: z.enum(["google", "apple"]),
	providerUserId: z.string().trim().min(1),
	idToken: z.string().trim().min(1),
	email: z.string().trim().email().optional(),
	fullName: z.string().trim().min(1).optional(),
	avatarUrl: z.string().trim().url().optional(),
	accessToken: z.string().trim().min(1).optional(),
	refreshToken: z.string().trim().min(1).optional(),
});

const addConnectionBodySchema = z.object({
	provider: z.enum(["google", "apple"]),
	providerUserId: z.string().trim().min(1),
	idToken: z.string().trim().min(1),
	email: z.string().trim().email().optional(),
	accessToken: z.string().trim().min(1).optional(),
	refreshToken: z.string().trim().min(1).optional(),
});

const removeConnectionParamsSchema = z.object({
	provider: z.enum(["google", "apple"]),
});

function respondAuthError(res: Response, error: unknown): void {
	if (error instanceof ZodError) {
		res.status(400).json({
			ok: false,
			error: {
				code: "AUTH_VALIDATION_FAILED",
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

authRouter.post("/provider/sign-in", async (req, res) => {
	try {
		const body = signInBodySchema.parse(req.body);
		const result = await signInWithProvider(body);

		res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

authRouter.get("/me", requireAuth, async (req, res) => {
	try {
		const result = await getMe(req.authUserId as string);

		res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

authRouter.post("/sign-out", requireAuth, async (req, res) => {
	try {
		const result = await signOut(req.authUserId as string);

		res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

authRouter.get("/connections", requireAuth, async (req, res) => {
	try {
		const result = await listConnections(req.authUserId as string);

		res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

authRouter.post("/connections", requireAuth, async (req, res) => {
	try {
		const body = addConnectionBodySchema.parse(req.body);
		const result = await addConnection(req.authUserId as string, body);

		res.status(201).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

authRouter.delete("/connections/:provider", requireAuth, async (req, res) => {
	try {
		const params = removeConnectionParamsSchema.parse(req.params);
		const result = await removeConnection(req.authUserId as string, params.provider);

		res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error: unknown) {
		respondAuthError(res, error);
	}
});

export { authRouter };

