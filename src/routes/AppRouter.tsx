import type { ReactElement } from 'react'
import { useSyncExternalStore } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../shared/layouts/AppLayout'
import { HomePage } from '../pages/HomePage'
import { MatchDetailPage } from '../pages/MatchDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminMarketsPage } from '../pages/AdminMarketsPage'
import { AdminSimulatePage } from '../pages/AdminSimulatePage'
import { AdminBillsPage } from '../pages/AdminBillsPage'
import { AdminTemplatesPage } from '../pages/AdminTemplatesPage'
import { PlayerBetsPage } from '../pages/PlayerBetsPage'
import { PlayerMinePage } from '../pages/PlayerMinePage'
import { AgentCreatePage } from '../pages/AgentCreatePage'
import { AgentCreateMatchPage } from '../pages/AgentCreateMatchPage'
import { AgentCreateSuccessPage } from '../pages/AgentCreateSuccessPage'
import { AgentBillsPage } from '../pages/AgentBillsPage'
import { getAuthVersion, getCurrentUser, subscribeCurrentUser } from '../services/authService'
import type { UserRole } from '../types/domain'

function RequireRole({
  role,
  children,
}: {
  role: UserRole
  children: ReactElement
}) {
  useSyncExternalStore(subscribeCurrentUser, getAuthVersion)
  const currentUser = getCurrentUser()
  if (currentUser.role !== role) {
    return <Navigate to="/matches" replace />
  }
  return children
}

function MatchesEntry() {
  useSyncExternalStore(subscribeCurrentUser, getAuthVersion)
  const currentUser = getCurrentUser()
  if (currentUser.role === 'admin') {
    return <Navigate to="/admin/markets" replace />
  }
  return <HomePage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesEntry />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/bets" element={<PlayerBetsPage />} />
          <Route
            path="/me"
            element={
              <RequireRole role="player">
                <PlayerMinePage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/create"
            element={
              <RequireRole role="agent">
                <AgentCreatePage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/create/new"
            element={
              <RequireRole role="agent">
                <AgentCreateMatchPage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/create/success/:id"
            element={
              <RequireRole role="agent">
                <AgentCreateSuccessPage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/bills"
            element={
              <RequireRole role="agent">
                <AgentBillsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/markets"
            element={
              <RequireRole role="admin">
                <AdminMarketsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/simulate"
            element={
              <RequireRole role="admin">
                <AdminSimulatePage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/bills"
            element={
              <RequireRole role="admin">
                <AdminBillsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <RequireRole role="admin">
                <AdminTemplatesPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
