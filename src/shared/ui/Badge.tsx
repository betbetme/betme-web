import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClass = {
    default: 'bg-[#24124a] text-[#a79bc8] border border-[#3a2a66]',
    primary: 'bg-[#8f6bff26] text-[#bca8ff] border border-[#8f6bff55]',
    success: 'bg-[#79ff3a1f] text-[#9bff70] border border-[#79ff3a66]',
    danger: 'bg-[#ff4fcb22] text-[#ff84db] border border-[#ff4fcb66]',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium',
        variantClass,
        className,
      )}
      {...props}
    />
  )
}
