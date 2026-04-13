You are a senior full-stack engineer working on a production-grade SaaS application.

Your task is to design and implement a "Social Link → Product Detection Pipeline" for a web application (Next.js App Router + TypeScript + Node.js backend).

The feature works as follows:

USER FLOW:
1. User clicks "Copy Link" button on homepage.
2. A modal opens with an input field.
3. User pastes a social media link (Instagram, TikTok, Facebook).
4. User clicks "Analyze".
5. System:
   - Reads the content behind the link
   - Extracts meaningful text (caption/title/metadata)
   - Detects product(s) mentioned
   - Matches them against internal product database
6. UI displays:
   - Platform
   - Content preview (thumbnail + author)
   - Detected products
   - Match confidence

---

## 🧱 ARCHITECTURE REQUIREMENTS

Design a modular backend with 3 main services:

### 1. socialLinkParser
Input:
{ url: string }

Output:
{
  platform: "instagram" | "tiktok" | "facebook" | "unknown",
  normalizedUrl: string,
  resourceType: "post" | "reel" | "video" | "unknown",
  resourceId?: string
}

Requirements:
- Normalize URLs (remove query params, tracking params)
- Detect platform using robust regex
- Extract resource ID where possible

---

### 2. socialContentReader

Input:
{
  platform: string,
  url: string
}

Output:
{
  text: string,
  author?: string,
  thumbnail?: string,
  metadata: Record<string, any>
}

Implementation strategy:

- TikTok:
  - Use oEmbed endpoint
  - Extract title, author_name, thumbnail_url

- Instagram:
  - Attempt oEmbed (if possible)
  - Fallback: OpenGraph scraping

- Facebook:
  - Attempt oEmbed / OG tags

- Fallback strategy:
  - Fetch HTML
  - Extract:
    - og:title
    - og:description
    - og:image
    - JSON-LD if available

Constraints:
- Do NOT rely solely on scraping (must be fallback only)
- Handle failures gracefully
- Return partial data if needed

---

### 3. productDetector

Input:
{
  text: string
}

Output:
{
  detectedProducts: [
    {
      brand: string | null,
      name: string | null,
      confidence: number
    }
  ]
}

Implementation:
- Use LLM (OpenAI or similar) OR rule-based extraction
- Extract:
  - brand
  - product name
  - category (optional)
- Return confidence score per product

---

### 4. productMatcher

Input:
{
  detectedProducts: [...]
}

Output:
{
  matches: [
    {
      productId: string,
      brand: string,
      name: string,
      matchType: "exact" | "fuzzy" | "possible",
      confidence: number
    }
  ]
}

Requirements:
- Use DB (PostgreSQL + Prisma)
- Implement:
  - exact match
  - fuzzy match (ILIKE or trigram)
  - alias matching

---

## 🗄️ DATABASE DESIGN (Prisma)

Create a Product model:

model Product {
  id              String   @id @default(cuid())
  brand           String
  name            String
  normalizedName  String
  aliases         String[]
  category        String?
  ean             String?
  createdAt       DateTime @default(now())
}

---

## 🧠 LLM PROMPT FOR PRODUCT EXTRACTION

Use this prompt internally:

"Extract product mentions from the following text. Return JSON only.

Text:
{{text}}

Output format:
{
  products: [
    {
      brand: string | null,
      name: string | null,
      confidence: number (0-1)
    }
  ]
}
"

---

## 🔌 API DESIGN

Create a single API route:

POST /api/analyze-link

Request:
{
  url: string
}

Response:
{
  platform: string,
  preview: {
    author?: string,
    thumbnail?: string
  },
  detectedProducts: [...],
  matches: [...]
}

---

## ⚙️ IMPLEMENTATION DETAILS

- Use Next.js App Router (route.ts)
- Use fetch for external APIs
- Add timeout handling (important)
- Add retry logic (max 2 retries)
- Log failures (console or structured logging)

---

## 🧪 EDGE CASES

Handle:
- Invalid URL
- Unsupported platform
- Private content
- Empty metadata
- No product detected
- Multiple products

Return structured fallback responses instead of throwing errors.

---

## 🚀 BONUS (IF TIME PERMITS)

- Add caching layer (in-memory or Redis)
- Add rate limiting
- Add background job queue for heavy parsing
- Add confidence scoring aggregation

---

## 🎯 OUTPUT EXPECTATION

Produce:
1. Folder structure
2. All service implementations
3. API route implementation
4. Prisma schema
5. Example test cases

Code must be:
- Clean
- Modular
- Typed (TypeScript)
- Production-ready (not pseudo-code)

Do not skip error handling.
Do not oversimplify.