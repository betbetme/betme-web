import type { HTMLAttributes } from 'react'
import { cn } from './cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  muted?: boolean
}

export function Card({ className, muted = false, ...props }: CardProps) {
  return (
    <div className={cn(muted ? 'ui-card-muted' : 'ui-card', className)} {...props} />
  )
}
