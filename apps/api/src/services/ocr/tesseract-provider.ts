import { createWorker, type Worker } from 'tesseract.js'
import type { OcrOptions, OcrProvider, OcrResult } from './types.js'

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_LANGUAGE = 'eng'

// ─── TesseractProvider ──────────────────────────────────────────────────────

export class TesseractProvider implements OcrProvider {
  private worker: Worker | null = null
  private initPromise: Promise<Worker> | null = null
  private currentLanguage: string = DEFAULT_LANGUAGE

  private async getWorker(language: string): Promise<Worker> {
    // Re-create worker if requested language changed
    if (this.worker && this.currentLanguage !== language) {
      await this.worker.terminate()
      this.worker = null
      this.initPromise = null
    }

    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      try {
        const worker = await createWorker(language)
        this.worker = worker
        this.currentLanguage = language
        return worker
      } catch (err) {
        this.initPromise = null
        throw new Error(
          `Failed to initialize Tesseract worker: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    })()

    return this.initPromise
  }

  async recognize(imageBuffer: Buffer, options?: OcrOptions): Promise<OcrResult> {
    const language = options?.language ?? DEFAULT_LANGUAGE
    const start = performance.now()

    let worker: Worker
    try {
      worker = await this.getWorker(language)
    } catch (err) {
      throw new Error(
        `OCR worker initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    try {
      const { data } = await worker.recognize(imageBuffer)
      const elapsed = (performance.now() - start).toFixed(0)
      console.log(`[OCR] Tesseract processed image in ${elapsed}ms (lang=${language})`)

      return {
        text: data.text.trim(),
        confidence: data.confidence / 100,
        language,
      }
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(0)
      console.error(`[OCR] Tesseract failed after ${elapsed}ms:`, err)
      throw new Error(
        `OCR recognition failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.initPromise = null
    }
  }
}
