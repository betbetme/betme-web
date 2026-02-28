import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type ToastVariant = 'info' | 'success' | 'error'

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant
}

export function Toast({ className, variant = 'info', ...props }: ToastProps) {
  const variantClass = {
    info: 'border-[#8f6bff66] bg-[#8f6bff33] text-[#efeaff]',
    success: 'border-[#79ff3a66] bg-[#79ff3a2e] text-[#e7ffdb]',
    error: 'border-[#ff4fcb66] bg-[#ff4fcb33] text-[#ffe8f7]',
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
