import type { ReactNode, MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const TAP_TOOLTIP_AUTO_HIDE_MS = 2000

interface Props {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  className?: string
  form?: string
  'aria-label'?: string
}

export function MutationButton({ children, onClick, type = 'button', variant = 'default', size, disabled, className, form, 'aria-label': ariaLabel }: Readonly<Props>) {
  const { t } = useTranslation()
  const isDemo = useAuthStore(state => state.user)?.role === 'DEMO'
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(autoHideTimerRef.current), [])

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (isDemo) {
      // Kept as a real, focusable/clickable <button> (aria-disabled, not disabled) specifically so
      // this fires on both mouse click and touch tap — a truly disabled button would swallow taps
      // silently, leaving touch users with no way to learn why the action is unavailable.
      // stopPropagation here too: the caller's onClick (which would normally do this, e.g. to stop
      // a card-level "open" handler from also firing) is intentionally skipped in this branch.
      e.preventDefault()
      e.stopPropagation()
      // Always set true (never toggle): Radix's TooltipTrigger has its own onPointerDown handler
      // that closes the tooltip if it's already open, which runs just before this click handler and
      // also writes to this same state — an unconditional `true` here always wins as the batch's
      // final value regardless of what that handler just did, so hover (desktop) can stay wired to
      // the same onOpenChange without racing against a tap that reopens an already-open tooltip.
      setTooltipOpen(true)
      clearTimeout(autoHideTimerRef.current)
      autoHideTimerRef.current = setTimeout(() => setTooltipOpen(false), TAP_TOOLTIP_AUTO_HIDE_MS)
      return
    }
    onClick?.(e)
  }

  const button = (
    <Button
      type={type}
      form={form}
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!isDemo && disabled}
      aria-disabled={isDemo || disabled}
      className={cn(isDemo && 'opacity-50', className)}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  )

  if (!isDemo) return button

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          {t('common.demoTooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
