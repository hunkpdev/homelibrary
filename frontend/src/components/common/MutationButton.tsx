import type { ReactNode, MouseEventHandler } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
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

  const button = (
    <Button
      type={type}
      form={form}
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isDemo || disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  )

  if (!isDemo) return button

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          {t('common.demoTooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
