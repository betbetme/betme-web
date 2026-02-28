import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleDollarSign, Home, Menu, User } from 'lucide-react'
import {
  getAuthVersion,
  getCurrentUser,
  setCurrentUserByRole,
  subscribeCurrentUser,
} from '../../services/authService'
import { getStoreVersion, subscribeStore } from '../../services/dataStore'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getBetSlipVersion, hasBetSlipItems, subscribeBetSlip } from '../../services/betSlipStore'
import { getPlayerBetRecords } from '../../services/betmeService'
import { formatMoneyU } from '../formatters/money'

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  useSyncExternalStore(subscribeCurrentUser, getAuthVersion)
  useSyncExternalStore(subscribeBetSlip, getBetSlipVersion)
  const currentUser = getCurrentUser()
  const [menuOpen, setMenuOpen] = useState(false)

  const walletLabel = useMemo(() => {
    const wallet = currentUser.walletAddress ?? currentUser.id
    if (wallet.length <= 10) {
      return wallet
    }
    return `${wallet.slice(0, 4)}...${wallet.slice(-3)}`
  }, [currentUser.id, currentUser.walletAddress])

  const switchRole = (role: 'player' | 'agent' | 'admin') => {
    setCurrentUserByRole(role)
    setMenuOpen(false)
    if (role === 'admin') {
      navigate('/admin/markets')
      return
    }
    if (role === 'player') {
      navigate('/matches')
      return
    }
    navigate('/matches')
  }

  const languageToggleLabel = i18n.resolvedLanguage === 'zh-TW' ? 'English' : '繁體中文'
  const hasPendingOrders =
    currentUser.role === 'player' &&
    getPlayerBetRecords(currentUser.id).some((record) => record.status === 'pending')

  const renderModeItem = (role: 'player' | 'agent' | 'admin') => {
    const isCurrent = currentUser.role === role
    return (
      <button
        type="button"
        onClick={() => switchRole(role)}
        disabled={isCurrent}
        className={`block w-full rounded-md px-3 py-2 text-left text-sm ${isCurrent ? 'text-slate-500' : 'text-slate-100 hover:bg-slate-800'}`}
      >
        {t(`menu.${role}`)}
        {isCurrent ? t('menu.currentSuffix') : ''}
      </button>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/matches" className="text-lg font-semibold text-slate-100">
              BETME
            </Link>
            <span className="hidden text-sm text-slate-400 md:inline">{t('app.demo')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="hidden sm:inline-flex">
              {walletLabel} | {t(`role.${currentUser.role}`)} | {formatMoneyU(currentUser.balance)}
            </Badge>
            <div className="relative">
              <Button
                type="button"
                variant="neutral"
                className="h-9 w-9 p-0"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={t('app.menu')}
              >
                <Menu size={18} />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg">
                  {renderModeItem('player')}
                  {renderModeItem('agent')}
                  {renderModeItem('admin')}
                  <button
                    type="button"
                    disabled
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-500"
                  >
                    {t('menu.orders')}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-500"
                  >
                    {t('menu.settings')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void i18n.changeLanguage(i18n.resolvedLanguage === 'zh-TW' ? 'en' : 'zh-TW')
                      setMenuOpen(false)
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    {languageToggleLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <Outlet context={{ currentUser }} />
      </main>

      {currentUser.role === 'player' ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95">
          <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-2">
            <NavLink
              to="/matches"
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-blue-300' : 'text-slate-400'}`
              }
            >
              <Home size={16} />
              <span>{t('tab.home')}</span>
            </NavLink>
            <NavLink
              to={currentUser.role === 'player' ? '/bets' : '/agent/create'}
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-blue-300' : 'text-slate-400'}`
              }
            >
              <CircleDollarSign size={16} />
              <span>{currentUser.role === 'player' ? t('tab.bet') : t('tab.create')}</span>
              {currentUser.role === 'player' && hasBetSlipItems() ? (
                <span className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              ) : null}
            </NavLink>
            <NavLink
              to="/me"
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-blue-300' : 'text-slate-400'}`
              }
            >
              <User size={16} />
              <span>{t('tab.mine')}</span>
              {hasPendingOrders ? (
                <span className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              ) : null}
            </NavLink>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
