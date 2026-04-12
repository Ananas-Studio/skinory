export type { ScanResult, ScannerConfig, ScannerProvider } from './types'
export { Html5QrcodeProvider } from './html5-qrcode-provider'

import type { ScannerProvider } from './types'
import { Html5QrcodeProvider } from './html5-qrcode-provider'

type ProviderType = 'html5-qrcode'

/** Factory – swap the underlying engine without touching consumers. */
export function createScanner(type: ProviderType = 'html5-qrcode'): ScannerProvider {
  switch (type) {
    case 'html5-qrcode':
      return new Html5QrcodeProvider()
    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown scanner provider: ${_exhaustive}`)
    }
  }
}
