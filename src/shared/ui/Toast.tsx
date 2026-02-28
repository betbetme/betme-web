import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type ToastVariant = 'info' | 'success' | 'error'

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant
}

export function Toast({ className, variant = 'info', ...props }: ToastProps) {
  const variantClass = {
    info: 'border-blue-500/30 bg-blue-500/15 text-blue-100',
    success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100',
    error: 'border-red-500/30 bg-red-500/15 text-red-100',
  }[variant]

  return (
    <div
      className={cn(
        'fixed right-4 top-20 z-50 max-w-sm rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur',
        variantClass,
        className,
      )}
      role="status"
      {...props}
    />
  )
}
