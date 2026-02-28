import { getDb } from './dataStore'
import type { User } from '../types/domain'

let currentUserId = 'agent-1'
const listeners = new Set<() => void>()
let authVersion = 0

function emitAuthChange() {
  authVersion += 1
  listeners.forEach((listener) => listener())
}

export function listDemoUsers(): User[] {
  return getDb().users.filter((user) => user.status === 'active')
}

export function subscribeCurrentUser(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCurrentUser(userId: string) {
  currentUserId = userId
  emitAuthChange()
}

export function setCurrentUserByRole(role: User['role']) {
  const user = listDemoUsers().find((item) => item.role === role)
  if (!user) {
    throw new Error(`No active user found for role: ${role}`)
  }
  currentUserId = user.id
  emitAuthChange()
}

export function getCurrentUser(): User {
  const user = getDb().users.find((item) => item.id === currentUserId)
  if (!user) {
    throw new Error('Current user not found')
  }
  return user
}

export function getAuthVersion() {
  return authVersion
}
