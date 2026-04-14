import { type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@skinory/ui/components/badge'
import { Button } from '@skinory/ui/components/button'
import { Card } from '@skinory/ui/components/card'
import { Input } from '@skinory/ui/components/input'
import {
  AlarmClock,
  Album,
  ArrowRight,
  Heart,
  House,
  MessagesSquare,
  ScanLine,
  Search,
} from '@skinory/ui/icons'
import { cn } from '@skinory/ui/lib/utils'
import type { Decision, NavKey, Product } from './types'

// linear-gradient(195deg, var(--Skinory-1, #FBA189) -204.56%, var(--Skinory-Color-2, #FEE7E1) 89.66%);

const frameVariantClasses: Record<'splash' | 'gradient' | 'paper' | 'camera', string> = {
  splash: 'bg-[#ee886e]',
  gradient: 'bg-[linear-gradient(195deg,#fba189_-204.56%,#fee7e1_89.66%)]',
  paper: 'bg-[#fee7e1]',
  camera: 'bg-cover bg-center',
}

const cameraBackgroundStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(0deg, rgba(24, 24, 27, 0.18), rgba(24, 24, 27, 0.18)), linear-gradient(180deg, #2a2a2e 0%, #18181b 100%)",
}

export function ScreenFrame({
  children,
  className,
  variant = 'paper',
}: {
  children: ReactNode
  className?: string
  variant?: 'splash' | 'gradient' | 'paper' | 'camera'
}) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col overflow-hidden px-4 text-[#18181b] [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif] ${frameVariantClasses[variant]} ${className}`}
      style={variant === 'camera' ? cameraBackgroundStyle : undefined}
    >
      {children}
    </main>
  )
}

export function DecisionTag({ decision }: { decision: Decision }) {
  const classByDecision: Record<Decision, string> = {
    Buy: 'border-[#bfeacc] bg-[#e1fee6] text-[#009636]',
    "Don't Buy": 'border-[#f5cccc] bg-[#fee1e1] text-[#d42b2b]',
    Caution: 'border-[#f3d8ab] bg-[#fef4e1] text-[#b16900]',
  }

  return (
    <Badge variant="outline" className={cn('px-2 py-0.5 text-[12px] leading-[16px] font-semibold', classByDecision[decision])}>
      {decision}
    </Badge>
  )
}

export function ProductCard({ item }: { item: Product }) {
  return (
    <Card className="flex flex-row items-center gap-2.5 rounded-[12px] border border-[#e4e4e7] bg-white p-2.5 py-2.5 shadow-none">
      <div className="h-14 w-14 shrink-0 rounded-[10px] bg-[linear-gradient(145deg,#f9ded7,#f4cbc0)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-[16px] font-medium">{item.name}</p>
        <p className="mt-0.5 text-[12px] leading-[16px] text-[#71717a]">{item.subtitle}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full border-[#e4e4e7] bg-white px-2 py-0.5 text-[11px] leading-[14px] font-normal text-[#27272a]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      {item.decision ? <DecisionTag decision={item.decision} /> : null}
    </Card>
  )
}

export function HorizontalProductCard({
  item,
  imageSrc = '/introduction-image.png',
  className,
  showDecisionPanel = false,
  onPress,
}: {
  item: Product
  imageSrc?: string
  className?: string
  showDecisionPanel?: boolean
  onPress?: () => void
}) {
  const decisionPanelClassByDecision: Record<Decision, string> = {
    Buy: 'bg-[#e1fee6]',
    "Don't Buy": 'bg-[#fee1e1]',
    Caution: 'bg-[#fef4e1]',
  }

  return (
    <Card className={cn('flex overflow-hidden rounded-xl border border-border p-0 shadow-none flex-row items-end gap-0', onPress && 'cursor-pointer', className)} onClick={onPress}>
      <img
        src={imageSrc}
        alt={item.name}
        className={cn('size-21 shrink-0 object-cover', showDecisionPanel && 'h-full w-21.5')}
        loading="lazy"
      />

      <div className={cn('flex min-w-0 flex-1 justify-between items-end gap-3 p-2.5', showDecisionPanel && 'items-start gap-0 p-0')}>
        <div className={cn('min-w-0', showDecisionPanel && 'min-w-0 flex-1 px-2.5 py-2')}>
          <p className={cn('truncate text-[14px] leading-[18px] font-normal text-primary', showDecisionPanel && 'text-sm leading-none font-medium text-[#0f172a]')}>
            {item.name}
          </p>
          <p className={cn('truncate text-[12px] leading-[16px] font-normal text-sidebar-foreground', showDecisionPanel && 'mt-1 text-sm leading-none text-[#334155]')}>
            {item.subtitle}
          </p>

          {item.tags.length ? (
            <div className={cn('mt-2 flex flex-wrap gap-2', showDecisionPanel && 'mt-1.5 gap-1.5')}>
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn('rounded-sm px-1 font-normal text-[#18181b]', showDecisionPanel && 'rounded-md border-[#e4e4e7] bg-white px-1.5 py-0.5 text-xs leading-4 text-[#09090b]')}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {showDecisionPanel && item.decision ? (
          <div
            className={cn(
              'flex h-[stretch] w-14 items-center justify-center border-l border-[#e4e4e7] px-3 text-center text-xs leading-4 font-medium text-black',
              decisionPanelClassByDecision[item.decision]
            )}
          >
            {item.decision === "Don't Buy" ? (
              <span>
                Don&apos;t
                <br />
                Buy
              </span>
            ) : (
              item.decision
            )}
          </div>
        ) : (
          <ArrowRight size={18} className="shrink-0 size-4.5 text-foreground" aria-hidden="true" />
        )}
      </div>
    </Card>
  )
}

export function VerticalProductCard({
  item,
  imageSrc = '/introduction-image.png',
  className,
  isFavorited = false,
  onToggleFavorite,
  onPress,
}: {
  item: Product
  imageSrc?: string
  className?: string
  isFavorited?: boolean
  onToggleFavorite?: () => void
  onPress?: () => void
}) {
  return (
    <Card
      className={cn('shrink-0 overflow-hidden size-fit w-[152px] gap-0 box-content rounded-[16px] border border-border p-0 shadow-none', onPress && 'cursor-pointer', className)}
      onClick={onPress}
    >
      <div className="relative">
        <img
          src={imageSrc}
          alt={item.name}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
        <button
          type="button"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/40 text-white backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.()
          }}
        >
          <Heart size={16} strokeWidth={2} fill={isFavorited ? 'currentColor' : 'none'} className={isFavorited ? 'text-red-500' : ''} />
        </button>
      </div>

      <div className="space-y-1 p-2">
        <p className="truncate text-[14px] leading-5 font-semibold text-[#18181b]">{item.name}</p>
        <p className="truncate text-[11px] leading-4 font-normal text-[#3f3f46]">{item.subtitle}</p>

        {item.tags.length ? (
          <div className="flex flex-row gap-1.5 pt-1">
            {item.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-sm flex-1 border-border px-2 py-0.5 text-[10px] leading-3.5 font-normal text-[#18181b] truncate"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function BottomNav({ active, className }: { active: NavKey; className?: string }) {
  const tabs = [
    { key: 'home' as const, label: 'Home', icon: House, href: '/home' },
    { key: 'inventory' as const, label: 'Inventory', icon: Album, href: '/inventory' },
    { key: 'scan' as const, label: '', icon: ScanLine, href: '/scan' },
    { key: 'adviser' as const, label: 'Adviser', icon: MessagesSquare, href: '/adviser/chat' },
    { key: 'routine' as const, label: 'Routine', icon: AlarmClock, href: '/home' },
  ]

  return (
    <nav className={cn('grid h-17 grid-cols-5 border-t-[3px] border-border bg-white pb-[var(--safe-bottom)]', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.key === active
        const isScan = tab.key === 'scan'

        return (
          <Button
            key={tab.key}
            asChild
            variant="ghost"
            className={cn(
              'h-auto rounded-none p-0 hover:bg-transparent',
              isActive || isScan ? 'text-foreground' : 'text-zinc-400',
              isActive ? 'font-medium' : 'font-normal',
              'border-transparent'
            )}
          >
            <Link to={tab.href} aria-label={tab.label || 'Scan'} className="flex w-full flex-col items-center justify-center text-xs leading-4 gap-1!">
              <span
                className={cn(
                  'grid place-items-center',
                  isScan
                    ? 'h-15 w-15 rounded-full border border-[#e4e4e7] bg-[#EE886E]'
                    : 'h-6 w-6'
                )}
              >
                <Icon size={24} className={cn('size-6', isScan && 'text-white')} />
              </span>
              {tab.label ? <span>{tab.label}</span> : null}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

export function SearchField({
  placeholder = 'Type a command or search...',
  className,
  value,
  onChange,
  onSubmit,
}: {
  placeholder?: string
  className?: string
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = (e.target as HTMLInputElement).value.trim()
      if (val && onSubmit) onSubmit(val)
    }
  }

  return (
    <div className={cn("flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2.5 text-[#a1a1aa]", className)}>
      <Search size={16} className="shrink-0" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onKeyDown={handleKeyDown}
        className="h-auto border-0 bg-transparent p-0 text-[14px] text-[#18181b] shadow-none placeholder:text-[#a1a1aa] focus-visible:ring-0"
      />
    </div>
  )
}

export function IconButton({ children, className, variant = 'default', muted = false, onClick }: { children: ReactNode; className?: string; variant?: 'default' | 'outline'; muted?: boolean; onClick?: () => void }) {
  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      onClick={onClick}
      className={cn('h-9 w-9 rounded-xl bg-white/90 text-[#09090b] shadow-none hover:bg-white', className, muted && 'opacity-45')}
    >
      {children}
    </Button>
  )
}

export function PrimaryButton({ children, className = '', onClick, disabled }: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ee886e] px-3 py-2 text-[14px] leading-[24px] font-medium text-[#fafafa] hover:bg-[#e27f66]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </Button>
  )
}

export function SecondaryButton({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[#e4e4e7] bg-white px-3 py-2 text-[14px] leading-[24px] font-medium text-[#09090b] shadow-none hover:bg-white',
        className
      )}
    >
      {children}
    </Button>
  )
}

export function Chip({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs leading-4 font-normal cursor-pointer select-none',
        active ? 'border-primary bg-primary text-white' : 'border-none bg-[#FEE7E1] text-primary font-medium'
      )}
      onClick={onClick}
    >
      {children}
    </Badge>
  )
}
