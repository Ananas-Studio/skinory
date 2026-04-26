export type { ScanResult, ScannerConfig, ScannerProvider } from './types'
export { BarcodeDetectorProvider } from './barcode-detector-provider'

import type { ScannerProvider } from './types'
import { BarcodeDetectorProvider } from './barcode-detector-provider'

type ProviderType = 'barcode-detector'

/** Factory – swap the underlying engine without touching consumers. */
export function createScanner(type: ProviderType = 'barcode-detector'): ScannerProvider {
  switch (type) {
    case 'barcode-detector':
      return new BarcodeDetectorProvider()
    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown scanner provider: ${_exhaustive}`)
    }
  }
}
