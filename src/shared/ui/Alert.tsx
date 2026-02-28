import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type AlertVariant = 'info' | 'success' | 'error'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

export function Alert({ className, variant = 'info', ...props }: AlertProps) {
  const variantClass = {
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
  }[variant]

  return (
    <div
      className={cn('rounded-lg border px-3 py-2 text-sm', variantClass, className)}
      {...props}
    />
  )
}
