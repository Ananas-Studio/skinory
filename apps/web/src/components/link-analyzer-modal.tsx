import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LinkIcon, Loader2, ExternalLink, Sparkles, AlertCircle } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@skinory/ui/components/dialog'
import { Input } from '@skinory/ui/components/input'
import { useAuth } from '../contexts/auth-context'
import { analyzeLink, type SocialAnalysisResult } from '../lib/social-api'

// ─── Platform badge colors ───────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white',
  tiktok: 'bg-black text-white',
  facebook: 'bg-[#1877F2] text-white',
  unknown: 'bg-gray-200 text-gray-700',
}

// ─── Confidence label ────────────────────────────────────────────────────────

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.8) return { text: 'High', color: 'text-green-600' }
  if (c >= 0.5) return { text: 'Medium', color: 'text-yellow-600' }
  return { text: 'Low', color: 'text-red-500' }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LinkAnalyzerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkAnalyzerModal({ open, onOpenChange }: LinkAnalyzerModalProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SocialAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    if (!url.trim() || !user) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await analyzeLink(user.id, url.trim())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [url, user])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text)
    } catch {
      // Clipboard not available
    }
  }, [])

  const handleReset = useCallback(() => {
    setUrl('')
    setResult(null)
    setError(null)
  }, [])

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) handleReset()
      onOpenChange(next)
    },
    [onOpenChange, handleReset],
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles size={18} className="text-[#EE886E]" />
            Analyze Social Link
          </DialogTitle>
        </DialogHeader>

        {/* ── URL input ────────────────────────────────────────────────── */}
        {!result && !loading && (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Paste a link from Instagram, TikTok, or Facebook to detect skincare products mentioned in the post.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="https://www.instagram.com/p/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="shrink-0"
              >
                Paste
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button
              type="button"
              className="bg-[#EE886E] hover:bg-[#d9775d] text-white"
              onClick={handleAnalyze}
              disabled={!url.trim()}
            >
              <LinkIcon size={16} />
              Analyze Link
            </Button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-[#EE886E]" />
            <p className="text-sm text-muted-foreground">Analyzing post content…</p>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Platform badge + preview */}
            <div className="flex items-start gap-3">
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${PLATFORM_COLORS[result.platform] ?? PLATFORM_COLORS.unknown}`}
              >
                {result.platform}
              </span>
              {result.preview.author && (
                <span className="text-xs text-muted-foreground truncate">
                  @{result.preview.author}
                </span>
              )}
            </div>

            {result.preview.text && (
              <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-foreground line-clamp-4">
                {result.preview.text}
              </p>
            )}

            {/* Matched products */}
            {result.matches.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Products Found</h3>
                {result.matches.map((m) => {
                  const conf = confidenceLabel(m.confidence)
                  return (
                    <div
                      key={m.productId}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <img
                        src={m.imageUrl ?? '/introduction-image.png'}
                        alt={m.name}
                        className="h-10 w-10 shrink-0 rounded-md bg-muted object-cover"
                      />
                      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium leading-tight truncate">{m.name}</span>
                        {m.brand && (
                          <span className="text-xs text-muted-foreground truncate">{m.brand}</span>
                        )}
                        <span className={`text-[10px] font-medium ${conf.color}`}>
                          {conf.text} match · {m.matchType}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          handleClose(false)
                          navigate(`/products/${m.productId}`)
                        }}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : result.detectedProducts.length > 0 ? (
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">Detected Mentions</h3>
                <p className="text-xs text-muted-foreground">
                  Products mentioned but not yet in our database:
                </p>
                {result.detectedProducts.map((dp, i) => (
                  <span key={i} className="text-xs text-foreground">
                    • {[dp.brand, dp.name].filter(Boolean).join(' – ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-muted-foreground">
                No skincare products detected in this post.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Analyze another link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
