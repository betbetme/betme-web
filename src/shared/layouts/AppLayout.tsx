import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
  const menuWrapRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuOpen) return
      const target = event.target as Node
      if (menuWrapRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const renderModeItem = (role: 'player' | 'agent' | 'admin') => {
    const isCurrent = currentUser.role === role
    return (
      <button
        type="button"
        onClick={() => switchRole(role)}
        disabled={isCurrent}
        className={`block w-full rounded-md px-3 py-2 text-left text-sm ${isCurrent ? 'text-[#7f73a7]' : 'text-[var(--text)] hover:bg-[color:var(--surface-muted)]'}`}
      >
        {t(`menu.${role}`)}
        {isCurrent ? t('menu.currentSuffix') : ''}
      </button>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg)] backdrop-blur">
        <div className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4">
          <div className="flex items-center">
            <Link to="/matches" className="flex items-center text-[var(--text)]">
              <img
                src="/betme-logo.svg"
                alt="BETME"
                className="h-9 w-9 rounded object-contain"
              />
            </Link>
          </div>
          <Badge
            variant="primary"
            className="absolute left-1/2 hidden -translate-x-1/2 px-4 py-2 text-sm sm:inline-flex"
          >
            {walletLabel} | {t(`role.${currentUser.role}`)} | {formatMoneyU(currentUser.balance)}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuWrapRef}>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center text-white"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={t('app.menu')}
              >
                <Menu size={20} strokeWidth={2.25} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 shadow-lg">
                  {renderModeItem('player')}
                  {renderModeItem('agent')}
                  {renderModeItem('admin')}
                  <button
                    type="button"
                    disabled
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#7f73a7]"
                  >
                    {t('menu.orders')}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#7f73a7]"
                  >
                    {t('menu.settings')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void i18n.changeLanguage(i18n.resolvedLanguage === 'zh-TW' ? 'en' : 'zh-TW')
                      setMenuOpen(false)
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[color:var(--surface-muted)]"
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
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-3">
            <NavLink
              to="/matches"
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-white' : 'text-[#8f85ae]'}`
              }
            >
              <Home size={18} />
              <span>{t('tab.home')}</span>
            </NavLink>
            <NavLink
              to={currentUser.role === 'player' ? '/bets' : '/agent/create'}
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-white' : 'text-[#8f85ae]'}`
              }
            >
              <CircleDollarSign size={18} />
              <span>{currentUser.role === 'player' ? t('tab.bet') : t('tab.create')}</span>
              {currentUser.role === 'player' && hasBetSlipItems() ? (
                <span className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              ) : null}
            </NavLink>
            <NavLink
              to="/me"
              className={({ isActive }) =>
                `relative flex flex-col items-center text-xs ${isActive ? 'text-white' : 'text-[#8f85ae]'}`
              }
            >
              <User size={18} />
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
