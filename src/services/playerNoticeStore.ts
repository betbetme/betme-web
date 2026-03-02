import { getPlayerBetRecords } from './betmeService'

type Listener = () => void

const listeners = new Set<Listener>()
let noticeVersion = 0
const lastSeenPendingSignatureByUser = new Map<string, string>()

function emitNoticeChange() {
  noticeVersion += 1
  listeners.forEach((listener) => listener())
}

function buildPendingSignature(userId: string): string {
  return getPlayerBetRecords(userId)
    .filter((record) => record.status === 'pending')
    .map((record) => record.id)
    .sort()
    .join('|')
}

export function subscribePlayerNotice(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPlayerNoticeVersion() {
  return noticeVersion
}

export function hasUnreadPendingBets(userId: string): boolean {
  const currentSignature = buildPendingSignature(userId)
  if (!currentSignature) {
    return false
  }
  const seenSignature = lastSeenPendingSignatureByUser.get(userId) ?? ''
  return currentSignature !== seenSignature
}

export function markPendingBetsAsSeen(userId: string) {
  const currentSignature = buildPendingSignature(userId)
  const seenSignature = lastSeenPendingSignatureByUser.get(userId) ?? ''
  if (currentSignature === seenSignature) {
    return
  }
  lastSeenPendingSignatureByUser.set(userId, currentSignature)
  emitNoticeChange()
}
