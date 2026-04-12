import OpenAI from "openai";
import { env } from "../config/env.js";
import { getModels } from "../models/index.js";
import type { ADVICE_MESSAGE_ROLES } from "../models/db-types.js";

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const SYSTEM_PROMPT = `You are a Beauty Adviser — a friendly and knowledgeable skincare expert AI assistant.
Your role is to help users with personalized skincare advice, product recommendations, and routine building.

Guidelines:
- Be warm, concise, and helpful. Use a friendly tone.
- When recommending products, explain WHY they are suitable for the user's skin type or concern.
- If you identify a product that could be harmful or unsuitable, clearly state a CAUTION or DON'T BUY recommendation with reasons.
- Structure longer responses with bullet points for readability.
- If the user asks about a specific product, provide an honest assessment.
- Always consider skin type, sensitivity, and existing conditions when giving advice.
- Keep responses focused and actionable — avoid overly long explanations.
- If you don't have enough information about the user's skin, ask clarifying questions.
- Respond in the same language the user writes in.`;

function buildProductContextMessage(product: {
  name: string
  brandName: string | null
  category: string
  description: string | null
  ingredients: string[]
}): string {
  const lines = [
    `The user is currently looking at the following product:`,
    `- **Name:** ${product.name}`,
  ]
  if (product.brandName) lines.push(`- **Brand:** ${product.brandName}`)
  lines.push(`- **Category:** ${product.category}`)
  if (product.description) lines.push(`- **Description:** ${product.description}`)
  if (product.ingredients.length > 0) {
    lines.push(`- **Ingredients:** ${product.ingredients.join(", ")}`)
  }
  lines.push(
    "",
    "Use this product information as context when answering the user's questions. " +
    "Provide specific advice about this product when relevant."
  )
  return lines.join("\n")
}

type MessageRole = (typeof ADVICE_MESSAGE_ROLES)[number];

export interface ServiceAdviceSession {
  id: string;
  userId: string | null;
  title: string | null;
  status: string;
  sourceTrigger: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAdviceMessage {
  id: string;
  adviceSessionId: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export class AdviceServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AdviceServiceError";
  }
}

export async function createSession(
  userId: string,
  productId?: string,
): Promise<ServiceAdviceSession> {
  const { AdviceSession, AdviceMessage, Product, Brand, Ingredient } = getModels();

  const sourceTrigger = productId ? "scan" : "manual_question";

  const session = await AdviceSession.create({
    userId,
    status: "open",
    sourceTrigger,
  });

  if (productId) {
    const product = await Product.findByPk(productId, {
      include: [
        { model: Brand, as: "brand" },
        {
          model: Ingredient,
          as: "ingredients",
          through: { attributes: ["ingredientOrder"] },
        },
      ],
    });

    if (product) {
      const ingredients = ((product as any).ingredients ?? [])
        .sort((a: any, b: any) => (a.ProductIngredient?.ingredientOrder ?? 0) - (b.ProductIngredient?.ingredientOrder ?? 0))
        .map((i: any) => i.inciName as string);

      const contextMessage = buildProductContextMessage({
        name: product.name,
        brandName: (product as any).brand?.name ?? null,
        category: product.category,
        description: product.description,
        ingredients,
      });

      await AdviceMessage.create({
        adviceSessionId: session.id,
        role: "system",
        content: contextMessage,
      });

      if (!session.title) {
        session.title = product.name;
        await session.save();
      }
    }
  }

  return {
    id: session.id,
    userId: session.userId,
    title: session.title,
    status: session.status,
    sourceTrigger: session.sourceTrigger,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function listSessions(userId: string): Promise<ServiceAdviceSession[]> {
  const { AdviceSession } = getModels();

  const sessions = await AdviceSession.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });

  return sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    title: s.title,
    status: s.status,
    sourceTrigger: s.sourceTrigger,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function getSessionMessages(
  sessionId: string,
  userId: string
): Promise<ServiceAdviceMessage[]> {
  const { AdviceSession, AdviceMessage } = getModels();

  const session = await AdviceSession.findByPk(sessionId);
  if (!session || session.userId !== userId) {
    throw new AdviceServiceError("ADVICE_SESSION_NOT_FOUND", 404, "Session not found");
  }

  const messages = await AdviceMessage.findAll({
    where: { adviceSessionId: sessionId },
    order: [["createdAt", "ASC"]],
  });

  return messages.map((m) => ({
    id: m.id,
    adviceSessionId: m.adviceSessionId,
    role: m.role,
    content: m.content,
    metadata: m.metadata,
    createdAt: m.createdAt,
  }));
}

export async function sendMessageAndStream(
  sessionId: string,
  userId: string,
  userContent: string,
  onChunk: (chunk: string) => void,
  onDone: (fullContent: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  const { AdviceSession, AdviceMessage } = getModels();

  if (!env.openaiApiKey || env.openaiApiKey === "sk-your-openai-api-key-here") {
    throw new AdviceServiceError(
      "OPENAI_NOT_CONFIGURED",
      503,
      "OpenAI API key is not configured"
    );
  }

  const session = await AdviceSession.findByPk(sessionId);
  if (!session || session.userId !== userId) {
    throw new AdviceServiceError("ADVICE_SESSION_NOT_FOUND", 404, "Session not found");
  }

  if (session.status !== "open") {
    throw new AdviceServiceError("ADVICE_SESSION_CLOSED", 400, "Session is not open");
  }

  await AdviceMessage.create({
    adviceSessionId: sessionId,
    role: "user",
    content: userContent,
  });

  const history = await AdviceMessage.findAll({
    where: { adviceSessionId: sessionId },
    order: [["createdAt", "ASC"]],
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: env.openaiModel,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }

    await AdviceMessage.create({
      adviceSessionId: sessionId,
      role: "assistant",
      content: fullContent,
    });

    if (!session.title && fullContent.length > 0) {
      session.title = userContent.slice(0, 100);
      await session.save();
    }

    onDone(fullContent);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export function toPublicError(error: unknown): AdviceServiceError {
  if (error instanceof AdviceServiceError) {
    return error;
  }

  console.error("Advice service error:", error);
  return new AdviceServiceError("INTERNAL_SERVER_ERROR", 500, "Unexpected server error");
}
