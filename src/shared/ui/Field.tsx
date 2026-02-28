import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from './cn'

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('ui-input', className)} {...props} />
}

export function SelectInput({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('ui-select', className)} {...props} />
}
