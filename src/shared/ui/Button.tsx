import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type ButtonVariant = 'primary' | 'neutral' | 'success' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  className,
  variant = 'neutral',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'ui-btn-primary',
    neutral: 'ui-btn-neutral',
    success: 'ui-btn-success',
    danger: 'ui-btn-danger',
  }[variant]

  return <button className={cn(variantClass, className)} {...props} />
}
