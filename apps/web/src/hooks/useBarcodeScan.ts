import { useCallback, useEffect, useRef, useState } from 'react'
import { createScanner } from '../lib/scanner'
import type { ScanResult, ScannerProvider } from '../lib/scanner'

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseBarcodeScanOptions {
  /** DOM element ID where the camera preview will be rendered */
  containerId: string
  /** Called on each successful detection (after debounce) */
  onDetected?: (result: ScanResult) => void
  /** Start scanning automatically on mount (default: false) */
  autoStart?: boolean
  /** Barcode formats to detect */
  formats?: string[]
  /** Auto-stop after first successful detection (default: true) */
  stopOnDetected?: boolean
  /** Debounce interval in ms (default: 500) */
  debounceMs?: number
}

export type ScanError = {
  type:
    | 'permission_denied'
    | 'camera_not_found'
    | 'scan_failed'
    | 'initialization_failed'
  message: string
}

export interface UseBarcodeScanReturn {
  scanning: boolean
  result: ScanResult | null
  error: ScanError | null
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'checking'
  cameras: Array<{ id: string; label: string }>
  startScan: () => Promise<void>
  stopScan: () => Promise<void>
  switchCamera: (cameraId: string) => Promise<void>
  resetError: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyError(err: unknown): ScanError {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes('permission') || lower.includes('notallowed'))
    return { type: 'permission_denied', message: msg }
  if (
    lower.includes('no camera') ||
    lower.includes('notfound') ||
    lower.includes('requested device not found')
  )
    return { type: 'camera_not_found', message: msg }

  return { type: 'scan_failed', message: msg }
}

// Module-level promise to track async scanner cleanup, preventing camera lock
// when the component re-mounts before the previous destroy completes.
let pendingCleanup: Promise<void> | null = null

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBarcodeScan(
  options: UseBarcodeScanOptions,
): UseBarcodeScanReturn {
  const {
    containerId,
    onDetected,
    autoStart = false,
    formats,
    stopOnDetected = true,
    debounceMs = 500,
  } = options

  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<ScanError | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'prompt' | 'checking'
  >('checking')
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    [],
  )

  const scannerRef = useRef<ScannerProvider | null>(null)
  const lastDetectionRef = useRef(0)
  const mountedRef = useRef(true)
  // Keep latest callbacks in refs to avoid re-init on every render.
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  // ── Initialise provider once on mount ──────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    const scanner = createScanner()
    scannerRef.current = scanner

    async function bootstrap() {
      try {
        // Wait for previous scanner cleanup to release the camera.
        if (pendingCleanup) {
          await pendingCleanup
          pendingCleanup = null
        }

        // Check permission (non-blocking; falls back to 'prompt').
        const perm = await scanner.checkPermission()
        if (!mountedRef.current) return
        setPermissionStatus(perm)

        // Initialise the html5-qrcode instance.
        await scanner.init(containerId, { formats, facingMode: 'environment' })
        if (!mountedRef.current) return

        // Wire up detection callback with debounce.
        scanner.onDetected((scanResult) => {
          const now = Date.now()
          if (now - lastDetectionRef.current < debounceMs) return
          lastDetectionRef.current = now

          if (!mountedRef.current) return
          setResult(scanResult)
          onDetectedRef.current?.(scanResult)

          if (stopOnDetected) {
            scanner.stop().then(() => {
              if (mountedRef.current) setScanning(false)
            })
          }
        })

        if (autoStart) {
          await scanner.start()
          if (mountedRef.current) {
            setScanning(true)
            setPermissionStatus('granted')
          }

          // Enumerate cameras after start — permission is now granted so
          // enumerateDevices returns full labels (required on iOS Safari).
          try {
            const cams = await scanner.getCameras()
            if (mountedRef.current) setCameras(cams)
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        if (!mountedRef.current) return
        setError({
          type: 'initialization_failed',
          message:
            err instanceof Error ? err.message : 'Scanner initialization failed',
        })
      }
    }

    bootstrap()

    return () => {
      mountedRef.current = false
      pendingCleanup = scanner.destroy()
      scannerRef.current = null
    }
    // Intentionally depend only on stable mount-time values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId])

  // ── Controls ───────────────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      setError(null)
      await scanner.start()
      if (!mountedRef.current) return
      setScanning(true)
      setPermissionStatus('granted')

      // Refresh camera list after permission is granted.
      try {
        const cams = await scanner.getCameras()
        if (mountedRef.current) setCameras(cams)
      } catch {
        // Non-fatal
      }
    } catch (err) {
      if (!mountedRef.current) return
      const classified = classifyError(err)
      setError(classified)
      if (classified.type === 'permission_denied') {
        setPermissionStatus('denied')
      }
    }
  }, [])

  const stopScan = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await scanner.stop()
    } catch {
      // Ignore stop errors.
    }
    if (mountedRef.current) setScanning(false)
  }, [])

  const switchCamera = useCallback(async (cameraId: string) => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await scanner.switchCamera(cameraId)
    } catch (err) {
      if (mountedRef.current) setError(classifyError(err))
    }
  }, [])

  const resetError = useCallback(() => setError(null), [])

  return {
    scanning,
    result,
    error,
    permissionStatus,
    cameras,
    startScan,
    stopScan,
    switchCamera,
    resetError,
  }
}
