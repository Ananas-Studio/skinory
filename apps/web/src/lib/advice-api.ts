const API_BASE = "/api/advice";

export interface AdviceSession {
  id: string;
  userId: string | null;
  title: string | null;
  status: string;
  sourceTrigger: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdviceMessage {
  id: string;
  adviceSessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ApiOk<T> {
  ok: true;
  data: T;
}

interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResult<T> = ApiOk<T> | ApiErr;

function headers(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
}

export async function createSession(userId: string, productId?: string): Promise<AdviceSession> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify(productId ? { productId } : {}),
  });

  const json: ApiResult<AdviceSession> = await res.json();
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export async function listSessions(userId: string): Promise<AdviceSession[]> {
  const res = await fetch(`${API_BASE}/sessions`, {
    headers: headers(userId),
  });

  const json: ApiResult<AdviceSession[]> = await res.json();
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export async function getMessages(
  userId: string,
  sessionId: string
): Promise<AdviceMessage[]> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    headers: headers(userId),
  });

  const json: ApiResult<AdviceMessage[]> = await res.json();
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullContent: string) => void;
  onError: (message: string) => void;
}

export async function sendMessageStream(
  userId: string,
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ content }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text();
    callbacks.onError(text || "Failed to connect");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const event = JSON.parse(raw) as
          | { type: "chunk"; content: string }
          | { type: "done"; content: string }
          | { type: "error"; message: string };

        if (event.type === "chunk") {
          callbacks.onChunk(event.content);
        } else if (event.type === "done") {
          callbacks.onDone(event.content);
        } else if (event.type === "error") {
          callbacks.onError(event.message);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}
