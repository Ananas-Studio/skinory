import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Search, SendHorizontal } from '@skinory/ui/icons'
import { Badge } from '@skinory/ui/components/badge'
import { Button } from '@skinory/ui/components/button'
import { Input } from '@skinory/ui/components/input'
import { DecisionTag, IconButton, ScreenFrame } from './shared'
import {
  getMessages,
  sendMessageStream,
  type AdviceMessage,
} from '../lib/advice-api'
import type { ProductInfo } from '../lib/scan-api'
import type { Decision } from './types'
import { useAuth } from '../contexts/auth-context'

interface LocationState {
  sessionId: string
  initialMessages?: AdviceMessage[]
  autoSendMessage?: string
  productInfo?: ProductInfo | null
}

function parseDecisionFromContent(content: string): Decision | null {
  const lower = content.toLowerCase()
  if (lower.includes("don't buy") || lower.includes('dont buy')) return "Don't Buy"
  if (lower.includes('caution')) return 'Caution'
  if (/\bbuy\b/.test(lower) && !lower.includes("don't") && !lower.includes('dont')) return 'Buy'
  return null
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[318px] items-center gap-1.5 rounded-[16px] border border-[#e4e4e7] bg-white px-4 py-3">
        <span className="size-2 animate-bounce rounded-full bg-[#a1a1aa] [animation-delay:0ms]" />
        <span className="size-2 animate-bounce rounded-full bg-[#a1a1aa] [animation-delay:150ms]" />
        <span className="size-2 animate-bounce rounded-full bg-[#a1a1aa] [animation-delay:300ms]" />
      </div>
    </div>
  )
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-1.5 list-disc pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-1.5 list-decimal pl-4 last:mb-0">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-[#18181b]">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-[#f4f4f5] px-1 py-0.5 text-[13px] text-[#18181b]">{children}</code>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-1.5 text-[16px] font-semibold text-[#18181b]">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-1 text-[15px] font-semibold text-[#18181b]">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-1 text-[14px] font-semibold text-[#18181b]">{children}</h3>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-1.5 border-l-2 border-[#e4e4e7] pl-3 italic text-[#71717a]">{children}</blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#ee886e] underline underline-offset-2">{children}</a>
  ),
}

function MarkdownContent({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="prose-skinory">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
      {isStreaming ? (
        <span className="ml-0.5 inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse bg-[#ee886e]" />
      ) : null}
    </div>
  )
}

function AssistantBubble({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  const decision = parseDecisionFromContent(content)

  return (
    <article className="flex justify-start animate-fade-in-left">
      <div className="flex max-w-[318px] flex-col gap-2 rounded-[16px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px] text-[#3f3f46]">
        {decision ? <DecisionTag decision={decision} /> : null}
        <MarkdownContent content={content} isStreaming={isStreaming} />
      </div>
    </article>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <article className="flex justify-end animate-fade-in-right">
      <div className="max-w-[205px] rounded-[16px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px] text-[#3f3f46]">
        {content}
      </div>
    </article>
  )
}

function ProductCardBubble({ product }: { product: ProductInfo }) {
  return (
    <article className="flex justify-end animate-fade-in-right">
      <div className="flex max-w-[260px] gap-3 rounded-[16px] border border-[#e4e4e7] bg-white p-2.5">
        <img
          src={product.imageUrl ?? '/introduction-image.png'}
          alt={product.name}
          className="size-14 shrink-0 rounded-[10px] bg-[#f4f4f5] object-cover"
        />
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <p className="truncate text-[14px] font-semibold leading-5 text-[#18181b]">{product.name}</p>
          {product.brandName ? (
            <p className="truncate text-[12px] leading-4 text-[#71717a]">{product.brandName}</p>
          ) : null}
          {product.category ? (
            <Badge variant="outline" className="w-fit rounded-sm border-border px-1.5 py-0 text-[10px] leading-4 font-normal text-[#18181b]">
              {product.category}
            </Badge>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AdviserChattingScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const state = location.state as LocationState | null

  const sessionId = state?.sessionId ?? ''
  const productInfo = state?.productInfo ?? null
  const [messages, setMessages] = useState<AdviceMessage[]>(state?.initialMessages ?? [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoSendDone = useRef(false)

  // Auto-send message when arriving from product scan
  useEffect(() => {
    if (!sessionId || autoSendDone.current || !state?.autoSendMessage) return
    autoSendDone.current = true

    const message = state.autoSendMessage
    const userMsg: AdviceMessage = {
      id: crypto.randomUUID(),
      adviceSessionId: sessionId,
      role: 'user',
      content: message,
      metadata: null,
      createdAt: new Date().toISOString(),
    }
    setMessages([userMsg])
    setStreaming(true)
    setStreamingContent('')

    sendMessageStream(userId, sessionId, message, {
      onChunk: (chunk) => {
        setStreamingContent((prev) => prev + chunk)
      },
      onDone: (fullContent) => {
        const assistantMsg: AdviceMessage = {
          id: crypto.randomUUID(),
          adviceSessionId: sessionId,
          role: 'assistant',
          content: fullContent,
          metadata: null,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreamingContent('')
        setStreaming(false)
      },
      onError: (errorMsg) => {
        const errorAssistant: AdviceMessage = {
          id: crypto.randomUUID(),
          adviceSessionId: sessionId,
          role: 'assistant',
          content: `Sorry, something went wrong: ${errorMsg}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorAssistant])
        setStreamingContent('')
        setStreaming(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      navigate('/adviser/chat', { replace: true })
      return
    }

    if (!state?.initialMessages?.length && !state?.autoSendMessage) {
      getMessages(userId, sessionId)
        .then(setMessages)
        .catch(console.error)
    }
  }, [sessionId, navigate, state?.initialMessages?.length, state?.autoSendMessage])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  async function handleSend() {
    const message = input.trim()
    if (!message || streaming || !sessionId) return

    const userMsg: AdviceMessage = {
      id: crypto.randomUUID(),
      adviceSessionId: sessionId,
      role: 'user',
      content: message,
      metadata: null,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamingContent('')

    await sendMessageStream(userId, sessionId, message, {
      onChunk: (chunk) => {
        setStreamingContent((prev) => prev + chunk)
      },
      onDone: (fullContent) => {
        const assistantMsg: AdviceMessage = {
          id: crypto.randomUUID(),
          adviceSessionId: sessionId,
          role: 'assistant',
          content: fullContent,
          metadata: null,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreamingContent('')
        setStreaming(false)
      },
      onError: (errorMsg) => {
        const errorAssistant: AdviceMessage = {
          id: crypto.randomUUID(),
          adviceSessionId: sessionId,
          role: 'assistant',
          content: `Sorry, something went wrong: ${errorMsg}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorAssistant])
        setStreamingContent('')
        setStreaming(false)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <ScreenFrame variant="gradient">
      {/* Header */}
      <section className="mt-2 flex items-center justify-between">
        <IconButton muted onClick={() => navigate('/adviser/chat')}>
          <ArrowLeft size={18} />
        </IconButton>
        <p className="flex-1 text-center text-[16px] leading-none font-semibold text-black">
          Skinory Adviser
        </p>
        <div className="size-[32px] opacity-0" aria-hidden="true" />
      </section>

      {/* Messages area */}
      <section
        ref={scrollRef}
        className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Product card when arriving from scan */}
        {productInfo ? <ProductCardBubble product={productInfo} /> : null}

        {messages
          .filter((m) => m.role !== 'system')
          .map((msg) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} content={msg.content} />
            ) : (
              <AssistantBubble key={msg.id} content={msg.content} />
            )
          )}

        {streaming && streamingContent ? (
          <AssistantBubble content={streamingContent} isStreaming />
        ) : streaming ? (
          <TypingIndicator />
        ) : null}
      </section>

      {/* Input bar */}
      <section className="mt-auto mb-24 pt-4">
        <div className="flex gap-[4px] rounded-[24px] border border-[#e4e4e7] bg-white p-[4px]">
          <div className="flex h-[40px] flex-1 items-center gap-0 overflow-hidden rounded-l-[8px] bg-white px-[12px] py-[10px]">
            <div className="shrink-0 pr-[8px] opacity-50">
              <Search size={16} className="text-[#09090b]" />
            </div>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="Type a command or search..."
              className="h-auto border-0 bg-transparent p-0 text-[14px] text-[#09090b] shadow-none placeholder:text-[#09090b]/50 focus-visible:ring-0 disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            size="icon"
            disabled={streaming || !input.trim()}
            onClick={handleSend}
            className="size-[40px] shrink-0 rounded-full bg-[#fba189] text-white hover:bg-[#e27f66] disabled:opacity-50"
          >
            {streaming ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </Button>
        </div>
      </section>
    </ScreenFrame>
  )
}

export default AdviserChattingScreen
