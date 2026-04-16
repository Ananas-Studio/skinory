// ─── ScrapingBee Client (singleton) ──────────────────────────────────────────
//
// Last-resort fallback for fetching web pages when all direct fetch attempts
// (retries, crawler UA, slug extraction, etc.) have been exhausted.
// When SCRAPINGBEE_API_KEY is not configured, every call returns null silently.
// ─────────────────────────────────────────────────────────────────────────────

import { ScrapingBeeClient } from "scrapingbee"
import { env } from "../config/env.js"

let client: ScrapingBeeClient | null = null

function getClient(): ScrapingBeeClient | null {
  if (!env.scrapingbeeApiKey) {
    console.warn("[scrapingbee] SCRAPINGBEE_API_KEY is not configured — skipping")
    return null
  }
  if (!client) {
    client = new ScrapingBeeClient(env.scrapingbeeApiKey)
    console.info("[scrapingbee] Client initialized")
  }
  return client
}

export interface ScrapingBeeOptions {
  /** Enable JavaScript rendering (costs more API credits). */
  renderJs?: boolean
  /** Use premium proxies for heavily protected sites (costs 10-25x credits). */
  premiumProxy?: boolean
}

/**
 * Fetch a page via ScrapingBee as a last-resort fallback.
 * If the first attempt fails with a server error, retries once with premium_proxy.
 * Returns the HTML string on success, or `null` on any failure.
 */
export async function fetchViaScrapingBee(
  url: string,
  opts?: ScrapingBeeOptions,
): Promise<string | null> {
  const bee = getClient()
  if (!bee) return null

  // Try standard proxy first, then premium if needed
  const attempts: { label: string; params: Record<string, unknown> }[] = [
    {
      label: "standard",
      params: {
        render_js: opts?.renderJs ?? false,
        ...(opts?.premiumProxy ? { premium_proxy: true } : {}),
      },
    },
  ]

  // If not already using premium, add a premium retry
  if (!opts?.premiumProxy) {
    attempts.push({
      label: "premium_proxy",
      params: {
        render_js: opts?.renderJs ?? false,
        premium_proxy: true,
      },
    })
  }

  for (const attempt of attempts) {
    try {
      console.info(`[scrapingbee] Fetching ${url} (${attempt.label}, render_js=${opts?.renderJs ?? false})`)

      const response = await bee.htmlApi({
        url,
        params: attempt.params,
      })

      const html = typeof response.data === "string"
        ? response.data
        : new TextDecoder().decode(response.data)

      if (!html || html.length < 100) {
        console.warn(`[scrapingbee] Empty or too-short response for ${url} (${html.length} bytes, ${attempt.label})`)
        continue
      }

      console.info(`[scrapingbee] Successfully fetched ${url} (${html.length} bytes, ${attempt.label})`)
      return html
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[scrapingbee] ${attempt.label} failed for ${url}: ${msg}`)
      // Continue to next attempt (premium proxy)
    }
  }

  console.error(`[scrapingbee] All attempts failed for ${url}`)
  return null
}
