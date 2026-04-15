import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { ScannerProvider, ScannerConfig, ScanResult } from './types'

/**
 * Maps our string format names to html5-qrcode enum values.
 * Centralised so format support changes live in one place.
 */
const FORMAT_MAP: Record<string, Html5QrcodeSupportedFormats> = {
  QR_CODE: Html5QrcodeSupportedFormats.QR_CODE,
  EAN_13: Html5QrcodeSupportedFormats.EAN_13,
  EAN_8: Html5QrcodeSupportedFormats.EAN_8,
  UPC_A: Html5QrcodeSupportedFormats.UPC_A,
  UPC_E: Html5QrcodeSupportedFormats.UPC_E,
  CODE_128: Html5QrcodeSupportedFormats.CODE_128,
  CODE_39: Html5QrcodeSupportedFormats.CODE_39,
  CODE_93: Html5QrcodeSupportedFormats.CODE_93,
  CODABAR: Html5QrcodeSupportedFormats.CODABAR,
  ITF: Html5QrcodeSupportedFormats.ITF,
  DATA_MATRIX: Html5QrcodeSupportedFormats.DATA_MATRIX,
  AZTEC: Html5QrcodeSupportedFormats.AZTEC,
  PDF_417: Html5QrcodeSupportedFormats.PDF_417,
}

/** Reverse-map html5-qrcode numeric format back to a readable string. */
const REVERSE_FORMAT_MAP = new Map<Html5QrcodeSupportedFormats, string>(
  Object.entries(FORMAT_MAP).map(([key, value]) => [value, key]),
)

function resolveFormats(
  names?: string[],
): Html5QrcodeSupportedFormats[] | undefined {
  if (!names || names.length === 0) return undefined
  const resolved: Html5QrcodeSupportedFormats[] = []
  for (const name of names) {
    const mapped = FORMAT_MAP[name]
    if (mapped !== undefined) resolved.push(mapped)
  }
  return resolved.length > 0 ? resolved : undefined
}

export class Html5QrcodeProvider implements ScannerProvider {
  private scanner: Html5Qrcode | null = null
  private config: ScannerConfig = {}
  private callback: ((result: ScanResult) => void) | null = null
  private running = false
  private activeCameraId: string | null = null

  async init(containerId: string, config: ScannerConfig = {}): Promise<void> {
    this.config = config

    const formatsToSupport = resolveFormats(config.formats)

    this.scanner = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport,
    })
  }

  async start(): Promise<void> {
    if (!this.scanner) {
      throw new Error('Scanner not initialised – call init() first')
    }
    if (this.running) return

    const facingMode = this.config.facingMode ?? 'environment'
    const cameraConfig = this.activeCameraId
      ? { deviceId: { exact: this.activeCameraId } }
      : { facingMode }

    await this.scanner.start(
      cameraConfig,
      {
        fps: this.config.fps ?? 10,
        aspectRatio: this.config.aspectRatio,
        // Constrain the scanning region so the decoder doesn't process the
        // full video frame — critical for reliable mobile performance.
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const side = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75)
          return { width: side, height: side }
        },
      },
      (decodedText, result) => {
        if (!this.callback) return

        const format =
          result?.result?.format?.format !== undefined
            ? (REVERSE_FORMAT_MAP.get(
                result.result.format.format as Html5QrcodeSupportedFormats,
              ) ?? 'UNKNOWN')
            : 'UNKNOWN'

        this.callback({
          text: decodedText,
          format,
          confidence: 1,
          timestamp: Date.now(),
        })
      },
      () => {
        // Scan frame with no match – intentionally ignored.
      },
    )

    this.running = true
  }

  async stop(): Promise<void> {
    if (!this.scanner || !this.running) return
    try {
      await this.scanner.stop()
    } catch {
      // Already stopped or never started – safe to ignore.
    }
    this.running = false
  }

  onDetected(callback: (result: ScanResult) => void): void {
    this.callback = callback
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const status = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      })
      if (status.state === 'granted') return 'granted'
      if (status.state === 'denied') return 'denied'
      return 'prompt'
    } catch {
      // Permissions API not supported (e.g. Safari) – assume prompt.
      return 'prompt'
    }
  }

  async getCameras(): Promise<Array<{ id: string; label: string }>> {
    const devices = await Html5Qrcode.getCameras()
    return devices.map((d) => ({ id: d.id, label: d.label }))
  }

  async switchCamera(cameraId: string): Promise<void> {
    const wasRunning = this.running
    if (wasRunning) await this.stop()
    this.activeCameraId = cameraId
    if (wasRunning) await this.start()
  }

  async destroy(): Promise<void> {
    await this.stop()
    try {
      await this.scanner?.clear()
    } catch {
      // Container might already be removed from DOM.
    }
    this.scanner = null
    this.callback = null
    this.activeCameraId = null
  }
}
