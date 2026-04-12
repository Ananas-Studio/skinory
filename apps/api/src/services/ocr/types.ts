// ─── OCR Provider Interface ─────────────────────────────────────────────────

export interface OcrResult {
  /** Extracted text */
  text: string
  /** 0–1 confidence score */
  confidence: number
  /** Detected language code */
  language: string
}

export interface OcrOptions {
  /** Tesseract language code, e.g. 'eng', 'tur', 'eng+tur' */
  language?: string
  /** Apply image preprocessing for better results */
  preprocessImage?: boolean
}

export interface OcrProvider {
  /** Extract text from an image buffer */
  recognize(imageBuffer: Buffer, options?: OcrOptions): Promise<OcrResult>
  /** Clean up resources (e.g. terminate workers) */
  destroy(): Promise<void>
}
