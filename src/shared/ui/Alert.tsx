import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type AlertVariant = 'info' | 'success' | 'error'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

export function Alert({ className, variant = 'info', ...props }: AlertProps) {
  const variantClass = {
    info: 'border-[#8f6bff55] bg-[#8f6bff22] text-[#d1c4ff]',
    success: 'border-[#79ff3a66] bg-[#79ff3a22] text-[#b6ff92]',
    error: 'border-[#ff4fcb66] bg-[#ff4fcb22] text-[#ff9be2]',
  }[variant]

  return (
    <div
      className={cn('rounded-xl border px-3 py-2 text-sm', variantClass, className)}
      {...props}
    />
  )
}
