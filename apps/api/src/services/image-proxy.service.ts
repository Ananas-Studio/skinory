const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const DOWNLOAD_TIMEOUT_MS = 10_000; // 10 seconds

export interface DownloadedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Infer a file extension from a content-type header value.
 */
function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  };
  const base = contentType.split(";")[0].trim().toLowerCase();
  return map[base] ?? "jpg";
}

/**
 * Download an image from a remote URL.
 * Enforces timeout, max size, and image content-type.
 * Returns null on any failure (graceful degradation).
 */
export async function downloadImage(
  url: string,
): Promise<DownloadedImage | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_IMAGE_SIZE) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) return null;

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: contentType.split(";")[0].trim(),
      extension: extensionFromContentType(contentType),
    };
  } catch {
    return null;
  }
}
