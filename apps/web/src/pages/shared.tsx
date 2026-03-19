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
    "linear-gradient(0deg, rgba(24, 24, 27, 0.18), rgba(24, 24, 27, 0.18)), url('https://www.figma.com/api/mcp/asset/29d1584c-7503-448b-8d67-6fa535673a1e')",
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
      className={`relative flex min-h-screen flex-col overflow-hidden px-4 text-[#18181b] [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif] ${frameVariantClasses[variant]} ${className}`}
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
}: {
  item: Product
  imageSrc?: string
  className?: string
}) {
  return (
    <Card className={cn('flex overflow-hidden rounded-xl border border-border p-0 shadow-none flex-row items-end gap-0', className)}>
      <img
        src={imageSrc}
        alt={item.name}
        className="size-21 shrink-0 object-cover"
        loading="lazy"
      />

      <div className="flex min-w-0 flex-1 justify-between items-end gap-3 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-[18px] font-normal text-primary">
            {item.name}
          </p>
          <p className="truncate text-[12px] leading-[16px] font-normal text-sidebar-foreground">
            {item.subtitle}
          </p>

          {item.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="rounded-sm px-1 font-normal text-[#18181b]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <ArrowRight size={18} className="shrink-0 size-4.5 text-foreground" aria-hidden="true" />
      </div>
    </Card>
  )
}

export function VerticalProductCard({
  item,
  imageSrc = '/introduction-image.png',
  className,
}: {
  item: Product
  imageSrc?: string
  className?: string
}) {
  return (
    <Card className={cn('shrink-0 overflow-hidden size-fit w-[152px] gap-0 box-content rounded-[16px] border border-border p-0 shadow-none', className)}>
      <div className="relative">
        <img
          src={imageSrc}
          alt={item.name}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
        <button
          type="button"
          aria-label="Add to favorites"
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/40 text-white backdrop-blur-sm"
        >
          <Heart size={16} strokeWidth={2} />
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
    <nav className={cn('grid h-17 grid-cols-5 border-t-[3px] border-border bg-white', className)}>
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

export function SearchField({ placeholder = 'Type a command or search...', className }: { placeholder?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2.5 text-[#a1a1aa]", className)}>
      <Search size={16} className="shrink-0" />
      <Input
        placeholder={placeholder}
        className="h-auto border-0 bg-transparent p-0 text-[14px] text-[#a1a1aa] shadow-none placeholder:text-[#a1a1aa] focus-visible:ring-0"
      />
    </div>
  )
}

export function IconButton({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Button
      type="button"
      variant="default"
      size="icon"
      className={cn('h-9 w-9 rounded-xl bg-white/90 text-[#09090b] shadow-none hover:bg-white', muted && 'opacity-45')}
    >
      {children}
    </Button>
  )
}

export function PrimaryButton({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Button
      type="button"
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ee886e] px-3 py-2 text-[14px] leading-[24px] font-medium text-[#fafafa] hover:bg-[#e27f66]',
        className
      )}
    >
      {children}
    </Button>
  )
}

export function SecondaryButton({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[#e4e4e7] bg-white px-3 py-2 text-[14px] leading-[24px] font-medium text-[#09090b] shadow-none hover:bg-white',
        className
      )}
    >
      {children}
    </Button>
  )
}

export function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs leading-4 font-normal',
        active ? 'border-primary bg-primary text-white' : 'border-none bg-[#FEE7E1] text-primary font-medium'
      )}
    >
      {children}
    </Badge>
  )
}
