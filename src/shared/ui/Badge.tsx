import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClass = {
    default: 'bg-slate-800 text-slate-200 border border-slate-700',
    primary: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
        variantClass,
        className,
      )}
      {...props}
    />
  )
}
