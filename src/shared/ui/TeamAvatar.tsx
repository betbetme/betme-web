import { useState } from 'react'
import { Shield } from 'lucide-react'
import { cn } from './cn'

interface TeamAvatarProps {
  teamName: string
  logoUrl?: string
  className?: string
}

function getInitials(teamName: string) {
  const parts = teamName
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return 'TM'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function TeamAvatar({ teamName, logoUrl, className }: TeamAvatarProps) {
  const [hasImgError, setHasImgError] = useState(false)
  const showImage = Boolean(logoUrl) && !hasImgError

  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[10px] font-semibold text-[var(--text)]',
        className,
      )}
      title={teamName}
      aria-label={teamName}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt={teamName}
          className="h-full w-full object-cover"
          onError={() => setHasImgError(true)}
        />
      ) : (
        <span className="inline-flex flex-col items-center justify-center leading-none">
          <Shield size={10} className="text-[var(--text-muted)]" />
          <span className="mt-0.5 text-[8px]">{getInitials(teamName)}</span>
        </span>
      )}
    </span>
  )
}
