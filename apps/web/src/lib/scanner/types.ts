export interface ScanResult {
  /** The barcode value */
  text: string
  /** Format identifier: EAN_13, UPC_A, QR_CODE, etc. */
  format: string
  /** Detection confidence between 0 and 1 */
  confidence: number
  /** Unix timestamp of the detection */
  timestamp: number
}

export interface ScannerConfig {
  /** Barcode formats to detect (e.g. ['EAN_13', 'QR_CODE']) */
  formats?: string[]
  /** Frames per second for scanning (default: 10) */
  fps?: number
  /** Camera aspect ratio (default: device-dependent) */
  aspectRatio?: number
  /** Which camera to prefer (default: 'environment') */
  facingMode?: 'environment' | 'user'
}

export interface ScannerProvider {
  /** Initialize scanner with a container element ID */
  init(containerId: string, config?: ScannerConfig): Promise<void>
  /** Start scanning */
  start(): Promise<void>
  /** Stop scanning */
  stop(): Promise<void>
  /** Register detection callback */
  onDetected(callback: (result: ScanResult) => void): void
  /** Check if camera permission is granted */
  checkPermission(): Promise<'granted' | 'denied' | 'prompt'>
  /** Get available cameras */
  getCameras(): Promise<Array<{ id: string; label: string }>>
  /** Switch to a specific camera */
  switchCamera(cameraId: string): Promise<void>
  /** Clean up all resources */
  destroy(): Promise<void>
}
