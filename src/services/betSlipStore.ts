import type { BetSelection } from '../types/domain'

type Listener = () => void

export interface BetSlipItem {
  marketId: string
  matchId: string
  selection: BetSelection
  amount?: number
}

const items: BetSlipItem[] = []
const listeners = new Set<Listener>()
let betSlipVersion = 0

function emitChange() {
  betSlipVersion += 1
  listeners.forEach((listener) => listener())
}

export function subscribeBetSlip(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBetSlipItems(): BetSlipItem[] {
  return [...items]
}

export function hasBetSlipItems(): boolean {
  return items.length > 0
}

export function getBetSlipTotalAmount(): number {
  return items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
}

export function areBetSlipItemsReady(): boolean {
  return items.length > 0 && items.every((item) => typeof item.amount === 'number')
}

export function upsertBetSlipSelection(input: Omit<BetSlipItem, 'amount'>) {
  const index = items.findIndex((item) => item.matchId === input.matchId)
  if (index >= 0) {
    if (items[index].selection === input.selection) {
      items.splice(index, 1)
      emitChange()
      return
    }
    items[index] = { ...items[index], selection: input.selection, amount: undefined }
  } else {
    items.push({ ...input, amount: undefined })
  }
  emitChange()
}

export function setBetSlipAmount(matchId: string, amount: number) {
  const index = items.findIndex((item) => item.matchId === matchId)
  if (index < 0) {
    return
  }
  const nextAmount = items[index].amount === amount ? undefined : amount
  items[index] = { ...items[index], amount: nextAmount }
  emitChange()
}

export function removeBetSlipItem(matchId: string) {
  const next = items.filter((item) => item.matchId !== matchId)
  if (next.length === items.length) {
    return
  }
  items.splice(0, items.length, ...next)
  emitChange()
}

export function clearBetSlip() {
  if (items.length === 0) {
    return
  }
  items.splice(0, items.length)
  emitChange()
}

export function getBetSlipVersion() {
  return betSlipVersion
}
