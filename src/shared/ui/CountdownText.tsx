import { useEffect, useMemo, useState } from 'react'

function formatRemaining(remainingMs: number) {
  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CountdownText({ targetTime }: { targetTime: string }) {
  const [now, setNow] = useState(() => Date.now())
  const targetMs = useMemo(() => new Date(targetTime).getTime(), [targetTime])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow((prev) => {
        const next = Date.now()
        if (next >= targetMs && prev >= targetMs) {
          return prev
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [targetMs])

  return <span className="ui-number">{formatRemaining(targetMs - now)}</span>
}
