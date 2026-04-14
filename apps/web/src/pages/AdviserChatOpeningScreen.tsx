import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Search, SendHorizontal } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { Input } from '@skinory/ui/components/input'
import { IconButton, ScreenFrame } from './shared'
import { createSession, sendMessageStream, type AdviceMessage } from '../lib/advice-api'
import type { ProductInfo } from '../lib/scan-api'
import { useAuth } from '../contexts/auth-context'

const AUTO_TRIGGER_MESSAGE = 'I just scanned this product. Can you tell me about it — is it good for my skin?'

interface LocationState {
  productId?: string
  productInfo?: ProductInfo | null
}

const SUGGESTION_CHIPS = [
  'How to take care of oily skin',
  'Best products for oily skin',
  'Tips for preventing acne on oily skin',
  'Effective skincare routine for oily skin',
]

function AdviserChatOpeningScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const state = location.state as LocationState | null
  const productId = state?.productId
  const productInfo = state?.productInfo ?? null
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoTriggered = useRef(false)

  const firstName = user!.fullName?.split(' ')[0] || ''

  // Auto-trigger chat when arriving with a productId
  useEffect(() => {
    if (!productId || autoTriggered.current) return
    autoTriggered.current = true

    ;(async () => {
      setSending(true)
      try {
        const session = await createSession(userId, productId)

        // Navigate to chatting immediately with product context — stream there
        navigate('/adviser/chatting', {
          replace: true,
          state: {
            sessionId: session.id,
            autoSendMessage: AUTO_TRIGGER_MESSAGE,
            productInfo,
          },
        })
      } catch (error) {
        console.error('Failed to create session:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to create session')
        setSending(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function handleSend(text?: string) {
    const message = (text ?? input).trim()
    if (!message || sending) return

    setSending(true)
    try {
      const session = await createSession(userId, productId)

      const userMsg: AdviceMessage = {
        id: crypto.randomUUID(),
        adviceSessionId: session.id,
        role: 'user',
        content: message,
        metadata: null,
        createdAt: new Date().toISOString(),
      }

      let assistantContent = ''
      await new Promise<void>((resolve, reject) => {
        sendMessageStream(userId, session.id, message, {
          onChunk: (chunk) => {
            assistantContent += chunk
          },
          onDone: () => resolve(),
          onError: (err) => reject(new Error(err)),
        })
      })

      const assistantMsg: AdviceMessage = {
        id: crypto.randomUUID(),
        adviceSessionId: session.id,
        role: 'assistant',
        content: assistantContent,
        metadata: null,
        createdAt: new Date().toISOString(),
      }

      navigate('/adviser/chatting', {
        state: {
          sessionId: session.id,
          initialMessages: [userMsg, assistantMsg],
        },
      })
    } catch (error) {
      console.error('Failed to start chat:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start chat')
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // If auto-triggering with a product, show loading state
  if (productId && sending) {
    return (
      <ScreenFrame variant="gradient">
        <section className="mt-2 flex items-center justify-between">
          <IconButton muted onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </IconButton>
          <p className="flex-1 text-center text-[16px] leading-none font-semibold text-black">
            Skinory Adviser
          </p>
          <div className="size-[32px] opacity-0" aria-hidden="true" />
        </section>

        <section className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 size={32} className="animate-spin text-[#EE886E]" />
          <p className="text-[14px] leading-[20px] text-[#3f3f46]">
            Analyzing your product…
          </p>
        </section>
      </ScreenFrame>
    )
  }

  return (
    <ScreenFrame variant="gradient">
      {/* Header */}
      <section className="mt-2 flex items-center justify-between">
        <IconButton muted>
          <ArrowLeft size={18} />
        </IconButton>
        <p className="flex-1 text-center text-[16px] leading-none font-semibold text-black">
          Skinory Adviser
        </p>
        <div className="size-[32px] opacity-0" aria-hidden="true" />
      </section>

      {/* Main content */}
      <section className="flex flex-1 flex-col justify-center gap-6 px-0">
        {/* Skinory logo placeholder */}
        <div className="size-[44px] overflow-hidden rounded-full border border-dashed border-[#3f3f46]/30 bg-[#3f3f46]/5" aria-hidden="true" />

        {/* Greeting */}
        <div className="flex flex-col gap-2">
          <div className="w-[269px] text-[36px] leading-[1.12] [font-family:Noorliza,'Iowan_Old_Style',serif]">
            <p className="text-[#ee886e]">Hi{firstName ? ` ${firstName}` : ''},</p>
            <p className="text-black">How can I help you today?</p>
          </div>
          <p className="w-[269px] text-[14px] leading-[20px] font-normal text-[#3f3f46]">
            Let&apos;s enhance your skincare routine for a glow with some great tips and products!
          </p>
        </div>
      </section>

      {/* Suggestion chips */}
      <div className="flex gap-[10px] overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={sending}
            onClick={() => handleSend(chip)}
            className="flex w-[130px] shrink-0 items-center justify-center rounded-[8px] bg-white/80 p-[12px] text-left text-[14px] leading-[20px] font-normal text-[#3f3f46] transition-colors hover:bg-white disabled:opacity-50"
          >
            <span className="overflow-hidden text-ellipsis">{chip}</span>
          </button>
        ))}
      </div>

      {/* Input bar */}
      <section className="mt-4 mb-24">
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
              disabled={sending}
              placeholder="Type a command or search..."
              className="h-auto border-0 bg-transparent p-0 text-[14px] text-[#09090b] shadow-none placeholder:text-[#09090b]/50 focus-visible:ring-0 disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            size="icon"
            disabled={sending || !input.trim()}
            onClick={() => handleSend()}
            className="size-[40px] shrink-0 rounded-full bg-[#fba189] text-white hover:bg-[#e27f66] disabled:opacity-50"
          >
            {sending ? (
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

export default AdviserChatOpeningScreen
