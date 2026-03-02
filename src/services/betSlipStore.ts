import type { BetSelection } from '../types/domain'

type Listener = () => void

export interface BetSlipItem {
  id: string
  marketId: string
  matchId: string
  selection: BetSelection
  amount?: number
}

const items: BetSlipItem[] = []
const listeners = new Set<Listener>()
let betSlipVersion = 0
let slipCounter = 0

function generateSlipId() {
  slipCounter += 1
  return `slip-${Date.now()}-${slipCounter}`
}

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

export function upsertBetSlipSelection(input: Omit<BetSlipItem, 'id' | 'amount'>) {
  const next = items.filter((item) => item.matchId !== input.matchId)
  next.unshift({ ...input, id: generateSlipId(), amount: undefined })
  items.splice(0, items.length, ...next)
  emitChange()
}

export function setBetSlipAmount(slipId: string, amount: number) {
  const index = items.findIndex((item) => item.id === slipId)
  if (index < 0) {
    return
  }
  items[index] = { ...items[index], amount }
  emitChange()
}

export function removeBetSlipItem(slipId: string) {
  const next = items.filter((item) => item.id !== slipId)
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
