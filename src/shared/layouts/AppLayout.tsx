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
import {
  getPlayerNoticeVersion,
  hasUnreadPendingBets,
  subscribePlayerNotice,
} from '../../services/playerNoticeStore'
import { formatMoneyU } from '../formatters/money'

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  useSyncExternalStore(subscribeCurrentUser, getAuthVersion)
  useSyncExternalStore(subscribeBetSlip, getBetSlipVersion)
  useSyncExternalStore(subscribePlayerNotice, getPlayerNoticeVersion)
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

  const languageToggleLabel = i18n.resolvedLanguage === 'zh-TW' ? 'English' : '繁體中文'
  const hasPendingOrders = currentUser.role === 'player' && hasUnreadPendingBets(currentUser.id)
  const currentIdentity: 'player' | 'agent' | 'platform' =
    currentUser.role === 'admin' ? 'platform' : currentUser.role

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

  const switchIdentity = (target: 'player' | 'agent' | 'platform') => {
    if (target === 'platform') {
      setCurrentUserByRole('admin')
      navigate('/admin/markets')
      setMenuOpen(false)
      return
    }
    if (target === 'agent') {
      setCurrentUserByRole('agent')
      navigate('/matches')
      setMenuOpen(false)
      return
    }
    setCurrentUserByRole('player')
    navigate('/matches')
    setMenuOpen(false)
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
          {currentIdentity === 'platform' ? null : (
            <Badge
              variant="primary"
              className="absolute left-1/2 hidden -translate-x-1/2 px-4 py-2 text-sm sm:inline-flex"
            >
              {`${walletLabel} | ${t(`role.${currentUser.role}`)} | ${formatMoneyU(currentUser.balance)}`}
            </Badge>
          )}
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
                  {(['platform', 'agent', 'player'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => switchIdentity(item)}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[color:var(--surface-muted)]"
                    >
                      {t(`menu.${item}`)}
                      {item === currentIdentity ? t('menu.currentSuffix') : ''}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-[color:var(--border)]" />
                  <button
                    type="button"
                    disabled
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#7f73a7]"
                  >
                    {t('menu.growthPlan')}
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
        <nav className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[60] border-t border-[color:var(--border)] bg-[color:var(--surface)]">
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
