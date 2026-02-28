import { initialDb } from '../mock/db'
import type { MockDatabase } from '../types/domain'

type Listener = () => void

const db: MockDatabase = structuredClone(initialDb)
const listeners = new Set<Listener>()
let storeVersion = 0

let idCounter = 100

export function generateId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

export function subscribeStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitStoreChange() {
  storeVersion += 1
  listeners.forEach((listener) => listener())
}

export function getStoreVersion() {
  return storeVersion
}

export function getDb(): MockDatabase {
  return db
}
