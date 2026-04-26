import {
  BarcodeDetector as Polyfill,
  type BarcodeFormat,
} from 'barcode-detector/ponyfill'
import type { ScannerProvider, ScannerConfig, ScanResult } from './types'

/**
 * Maps our uppercase format names to the BarcodeDetector API format strings.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API#supported_barcode_formats
 */
const FORMAT_TO_NATIVE: Record<string, BarcodeFormat> = {
  QR_CODE: 'qr_code',
  EAN_13: 'ean_13',
  EAN_8: 'ean_8',
  UPC_A: 'upc_a',
  UPC_E: 'upc_e',
  CODE_128: 'code_128',
  CODE_39: 'code_39',
  CODE_93: 'code_93',
  CODABAR: 'codabar',
  ITF: 'itf',
  DATA_MATRIX: 'data_matrix',
  AZTEC: 'aztec',
  PDF_417: 'pdf417',
}

/** Reverse map: native format string → our uppercase key. */
const FORMAT_FROM_NATIVE: Record<string, string> = Object.fromEntries(
  Object.entries(FORMAT_TO_NATIVE).map(([k, v]) => [v, k]),
)

/**
 * Scanner provider backed by the Web BarcodeDetector API with a ZXing-WASM
 * polyfill (`barcode-detector` npm package) for browsers without native support.
 *
 * Key advantages over html5-qrcode:
 *  - Processes the full video frame (no restrictive square qrbox)
 *  - Works reliably with barcodes in any orientation
 *  - Native API on Chromium → near-zero overhead on Android / Chrome
 *  - WASM fallback on Safari / Firefox for cross-browser parity
 */
export class BarcodeDetectorProvider implements ScannerProvider {
  private detector: Polyfill | null = null
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private container: HTMLElement | null = null
  private config: ScannerConfig = {}
  private callback: ((result: ScanResult) => void) | null = null
  private running = false
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null
  private activeCameraId: string | null = null

  async init(containerId: string, config: ScannerConfig = {}): Promise<void> {
    this.config = config
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container #${containerId} not found`)
    }

    const nativeFormats = config.formats
      ?.map((f) => FORMAT_TO_NATIVE[f])
      .filter(Boolean)

    this.detector = new Polyfill({
      formats: nativeFormats?.length ? nativeFormats : undefined,
    })
  }

  async start(): Promise<void> {
    if (!this.detector || !this.container) {
      throw new Error('Scanner not initialised – call init() first')
    }
    if (this.running) return

    // Create and inject a <video> element.
    this.video = document.createElement('video')
    this.video.setAttribute('autoplay', '')
    this.video.setAttribute('playsinline', '')
    this.video.setAttribute('muted', '')
    this.video.muted = true
    this.container.appendChild(this.video)

    // Acquire camera stream.
    const facingMode = this.config.facingMode ?? 'environment'
    const videoConstraints: MediaTrackConstraints = this.activeCameraId
      ? { deviceId: { exact: this.activeCameraId } }
      : {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    })

    this.video.srcObject = this.stream
    await this.video.play()

    this.running = true
    this.scheduleNextScan()
  }

  // ── Scan loop ────────────────────────────────────────────────────────────

  private scheduleNextScan(): void {
    if (!this.running) return
    const intervalMs = 1000 / (this.config.fps ?? 10)
    this.scanTimeoutId = setTimeout(() => this.scanFrame(), intervalMs)
  }

  private async scanFrame(): Promise<void> {
    if (!this.running || !this.video || !this.detector) return

    try {
      if (this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const barcodes = await this.detector.detect(this.video)

        if (barcodes.length > 0 && this.callback && this.running) {
          const best = barcodes[0]
          const format = FORMAT_FROM_NATIVE[best.format] ?? 'UNKNOWN'

          this.callback({
            text: best.rawValue,
            format,
            confidence: 1,
            timestamp: Date.now(),
          })
        }
      }
    } catch {
      // Detection errors (e.g. source closed) are non-fatal.
    }

    this.scheduleNextScan()
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async stop(): Promise<void> {
    this.running = false

    if (this.scanTimeoutId !== null) {
      clearTimeout(this.scanTimeoutId)
      this.scanTimeoutId = null
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
      this.video.remove()
      this.video = null
    }
  }

  onDetected(callback: (result: ScanResult) => void): void {
    this.callback = callback
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const status = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      })
      return status.state as 'granted' | 'denied' | 'prompt'
    } catch {
      // Permissions API not supported (e.g. Safari) – assume prompt.
      return 'prompt'
    }
  }

  async getCameras(): Promise<Array<{ id: string; label: string }>> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d) => ({
        id: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
      }))
  }

  async switchCamera(cameraId: string): Promise<void> {
    const wasRunning = this.running
    if (wasRunning) await this.stop()
    this.activeCameraId = cameraId
    if (wasRunning) await this.start()
  }

  async destroy(): Promise<void> {
    await this.stop()
    this.detector = null
    this.callback = null
    this.container = null
    this.activeCameraId = null
  }
}
