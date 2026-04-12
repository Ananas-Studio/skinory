import { TesseractProvider } from './tesseract-provider.js'
import type { OcrProvider } from './types.js'

export type { OcrOptions, OcrProvider, OcrResult } from './types.js'

// ─── Singleton registry ─────────────────────────────────────────────────────

let instance: OcrProvider | null = null

export function createOcrProvider(type: 'tesseract' = 'tesseract'): OcrProvider {
  if (instance) return instance

  switch (type) {
    case 'tesseract':
      instance = new TesseractProvider()
      break
    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown OCR provider: ${_exhaustive}`)
    }
  }

  return instance
}

/** Tear down the active provider (call on graceful shutdown). */
export async function destroyOcrProvider(): Promise<void> {
  if (instance) {
    await instance.destroy()
    instance = null
  }
}
