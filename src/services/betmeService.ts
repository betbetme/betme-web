import { emitStoreChange, generateId, getDb } from './dataStore'
import type { BetSlipItem } from './betSlipStore'
import type {
  BetRecord,
  BetSelection,
  FeeSplitMode,
  Match,
  MatchResult,
  MatchStatus,
  PlatformMarket,
  RiskLevel,
  User,
} from '../types/domain'

const DEFAULT_BET_AMOUNTS = [5, 10, 20] as const
export const BET_AMOUNTS = DEFAULT_BET_AMOUNTS
export const CREATE_LIQUIDITY_AMOUNTS = [500, 1000, 2000] as const
export const LOCK_TIME_OPTIONS = ['before_10m', 'kickoff', 'after_10m'] as const
export const FEE_RATE_OPTIONS = [2, 4, 6] as const
export const POOL_RELEASE_OPTIONS = ['auto', 'manual'] as const
export const RISK_PROFILE_OPTIONS = ['steady', 'aggressive'] as const

type CreateMatchInput = {
  agentId: string
  preMatchInfoId: string
  initialLiquidity: number
  feeRate?: number
}

type CreatePlatformMarketInput = {
  preMatchInfoId: string
  lockTime: number
  feeSplitMode: FeeSplitMode
  feeRate: number
  riskLevel: RiskLevel
  poolRequirement: number
}

const PLATFORM_USER_ID = 'admin-1'
const SIMULATION_PLAYER_ID = 'sim-player-1'
const STAGE_OPTIONS: Record<number, number[]> = {
  1: [5, 10],
  2: [5, 10, 20],
  3: [5, 10, 20, 40],
  4: [5, 10, 20, 50],
}
const R_SKEW_K = 1.2
const ODDS_MIN = 1.05
const ODDS_MAX = 12
const TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['locked', 'resolved', 'cancelled'],
  locked: ['open', 'resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
}

function nowIso() {
  return new Date().toISOString()
}

function isExpired(startTime: string) {
  return new Date(startTime).getTime() <= Date.now()
}

function money(value: number): number {
  return Number(value.toFixed(2))
}

function requireUser(userId: string): User {
  const user = getDb().users.find((item) => item.id === userId)
  if (!user) throw new Error('User not found')
  return user
}

function requireMatch(matchId: string): Match {
  const match = getDb().matches.find((item) => item.id === matchId)
  if (!match) throw new Error('Match not found')
  return match
}

function requireTemplate(templateId: string): PlatformMarket {
  const template = getDb().platformMarkets.find((item) => item.id === templateId)
  if (!template) throw new Error('Template not found')
  return template
}

function ensureSimulationPlayer() {
  let player = getDb().users.find((user) => user.id === SIMULATION_PLAYER_ID)
  if (player) return player
  player = {
    id: SIMULATION_PLAYER_ID,
    role: 'player',
    parentId: null,
    inviteCode: 'SIM-PLAYER',
    walletAddress: null,
    balance: 1_000_000_000,
    status: 'active',
    createdAt: nowIso(),
  }
  getDb().users.unshift(player)
  return player
}

function assertCanTransition(current: MatchStatus, next: MatchStatus) {
  if (!TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`)
  }
}

function getFeeSplitRatio(mode: FeeSplitMode) {
  if (mode === '55') return { platform: 0.5, agent: 0.5 }
  if (mode === '46') return { platform: 0.4, agent: 0.6 }
  return { platform: 0.3, agent: 0.7 }
}

type RiskGate = 'normal' | 'skewed' | 'danger' | 'extreme'

type MarketRiskControlSnapshot = {
  fcr: number
  topSideBetRatio: number
  exposureAmount: number
  exposureRatio: number
  releasedStage: 1 | 2 | 3 | 4
  releasedPool: number
  gate: RiskGate
  allowedBetAmounts: number[]
  rFactor: number
  dynamicOdds: Match['odds']
  haltedByRisk: boolean
}

type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed'
type SimulationDistribution = 'balanced' | 'home_bias' | 'away_bias'

type StartBetSimulationInput = {
  matchId: string
  userCount: number
  averageAmount: 5 | 10 | 20
  durationSec: 60 | 120 | 300
  distribution: SimulationDistribution
}

type BetSimulationSnapshot = {
  status: SimulationStatus
  matchId: string | null
  userCount: number
  averageAmount: 5 | 10 | 20
  durationSec: number
  elapsedSec: number
  processedUsers: number
  placedUsers: number
  skippedUsers: number
  totalStake: number
  distribution: SimulationDistribution
}

type BetSimulationState = BetSimulationSnapshot & {
  timer: ReturnType<typeof setInterval> | null
}

const betSimulationState: BetSimulationState = {
  status: 'idle',
  matchId: null,
  userCount: 0,
  averageAmount: 5,
  durationSec: 60,
  elapsedSec: 0,
  processedUsers: 0,
  placedUsers: 0,
  skippedUsers: 0,
  totalStake: 0,
  distribution: 'balanced',
  timer: null,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getStageByMetrics(fcr: number, topSideBetRatio: number): 1 | 2 | 3 | 4 {
  if (fcr >= 0.8 && topSideBetRatio <= 0.55) return 4
  if (fcr >= 0.5 && topSideBetRatio <= 0.6) return 3
  if (fcr >= 0.2 && topSideBetRatio <= 0.7) return 2
  return 1
}

function getGateByMetrics(
  topSideBetRatio: number,
  exposureRatio: number,
  totalPendingAmount: number,
): RiskGate {
  if (exposureRatio >= 1) return 'extreme'
  // Avoid over-blocking too early when only a tiny amount has been placed.
  if (totalPendingAmount < 20) return 'normal'
  if (topSideBetRatio >= 0.7 || exposureRatio >= 0.6) return 'danger'
  if (topSideBetRatio > 0.5 || exposureRatio >= 0.3) return 'skewed'
  return 'normal'
}

function buildDynamicOdds(
  baseOdds: Match['baseOdds'],
  sideAmounts: Record<MatchResult, number>,
  topSideBetRatio: number,
) {
  const total = sideAmounts.home_win + sideAmounts.draw + sideAmounts.away_win
  if (total <= 0) {
    return {
      homeWin: money(baseOdds.homeWin),
      draw: money(baseOdds.draw),
      awayWin: money(baseOdds.awayWin),
    }
  }
  const dominant = (['home_win', 'draw', 'away_win'] as const).reduce((prev, next) =>
    sideAmounts[next] > sideAmounts[prev] ? next : prev,
  )
  const skew = Math.max(topSideBetRatio - 0.5, 0)
  const rFactor = 1 + R_SKEW_K * skew
  const relieve = 1 + (rFactor - 1) * 0.6
  const apply = (key: MatchResult, base: number) => {
    const next = key === dominant ? base / rFactor : base * relieve
    return money(clamp(next, ODDS_MIN, ODDS_MAX))
  }
  return {
    homeWin: apply('home_win', baseOdds.homeWin),
    draw: apply('draw', baseOdds.draw),
    awayWin: apply('away_win', baseOdds.awayWin),
  }
}

function computeRiskControl(match: Match): MarketRiskControlSnapshot {
  const allBets = getDb().betRecords.filter((item) => item.matchId === match.id)
  const pendingBets = allBets.filter((item) => item.status === 'pending')
  const cumulativeFee = money(allBets.reduce((sum, item) => sum + item.feeAmount, 0))
  const pendingPoolStake = money(
    pendingBets.reduce((sum, item) => sum + (item.amount - item.feeAmount), 0),
  )
  const sideAmounts: Record<MatchResult, number> = {
    home_win: 0,
    draw: 0,
    away_win: 0,
  }
  const sideProjectedPayout: Record<MatchResult, number> = {
    home_win: 0,
    draw: 0,
    away_win: 0,
  }
  for (const bet of pendingBets) {
    sideAmounts[bet.selection] = money(sideAmounts[bet.selection] + bet.amount)
    sideProjectedPayout[bet.selection] = money(
      sideProjectedPayout[bet.selection] + bet.netAmount,
    )
  }
  const totalPendingAmount = money(
    sideAmounts.home_win + sideAmounts.draw + sideAmounts.away_win,
  )
  const topSideAmount = Math.max(sideAmounts.home_win, sideAmounts.draw, sideAmounts.away_win)
  const topSideBetRatio = totalPendingAmount > 0 ? money(topSideAmount / totalPendingAmount) : 0
  const worstCaseLoss = money(
    Math.max(
      sideProjectedPayout.home_win - pendingPoolStake,
      sideProjectedPayout.draw - pendingPoolStake,
      sideProjectedPayout.away_win - pendingPoolStake,
      0,
    ),
  )
  const exposureRatio = match.poolLocked > 0 ? money(worstCaseLoss / match.poolLocked) : 0
  const fcr = match.poolLocked > 0 ? money(cumulativeFee / match.poolLocked) : 0
  const releasedStage = getStageByMetrics(fcr, topSideBetRatio)
  const releasedPool = money(match.poolLocked * releasedStage * 0.25)
  const gate = getGateByMetrics(topSideBetRatio, exposureRatio, totalPendingAmount)
  const stageOptions = [...(STAGE_OPTIONS[releasedStage] ?? STAGE_OPTIONS[1])]
  const allowedBetAmounts =
    gate === 'extreme'
      ? []
      : gate === 'danger'
        ? [stageOptions[0]]
        : gate === 'skewed'
          ? stageOptions.slice(0, -1)
          : stageOptions
  const skew = Math.max(topSideBetRatio - 0.5, 0)
  const rFactor = money(1 + R_SKEW_K * skew)
  const baseOdds = match.baseOdds ?? match.odds
  return {
    fcr,
    topSideBetRatio,
    exposureAmount: worstCaseLoss,
    exposureRatio,
    releasedStage,
    releasedPool,
    gate,
    allowedBetAmounts,
    rFactor,
    dynamicOdds: buildDynamicOdds(baseOdds, sideAmounts, topSideBetRatio),
    haltedByRisk: exposureRatio >= 1,
  }
}

function syncRiskControlForMatch(matchId: string) {
  const match = requireMatch(matchId)
  if (match.status === 'cancelled' || match.status === 'resolved') return
  const control = computeRiskControl(match)
  match.odds = control.dynamicOdds
  match.maxRisk = money(Math.max(match.poolLocked, control.exposureAmount))
  if (control.haltedByRisk) {
    if (match.status === 'open') {
      match.status = 'locked'
    }
    match.riskHalted = true
    return
  }
  if (match.riskHalted && match.status === 'locked') {
    match.status = 'open'
  }
  match.riskHalted = false
}

export function getBetAmountOptions() {
  const configured = getDb().settings.betAmountOptions
  return configured.length > 0 ? configured : [...DEFAULT_BET_AMOUNTS]
}

export function getMarketRiskControlSnapshot(matchId: string) {
  const match = requireMatch(matchId)
  return computeRiskControl(match)
}

export function getAllowedBetAmountsForMatch(matchId: string) {
  const match = requireMatch(matchId)
  if (match.status !== 'open') return []
  return computeRiskControl(match).allowedBetAmounts
}

function assertActiveUser(user: User) {
  if (user.status !== 'active') throw new Error('User is disabled')
}

function adjustBalance(userId: string, amount: number) {
  const user = requireUser(userId)
  user.balance = money(user.balance + amount)
}

function writeBalanceLog(
  userId: string,
  type:
    | 'create_match'
    | 'bet'
    | 'payout'
    | 'adjust'
    | 'pool_freeze'
    | 'pool_unfreeze'
    | 'fee_income',
  amount: number,
  refId: string | null,
) {
  const user = requireUser(userId)
  getDb().balanceLogs.unshift({
    id: generateId('log'),
    userId,
    type,
    amount: money(amount),
    balanceAfter: money(user.balance),
    refId,
    createdAt: nowIso(),
  })
}

function splitTeams(title: string) {
  const [homeTeam = title, awayTeam = ''] = title.split(' vs ')
  return { homeTeam, awayTeam }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function findPreMatchByMatch(match: Match) {
  const teams = splitTeams(match.title)
  return getDb().preMatchInfos.find(
    (item) =>
      item.homeTeam === teams.homeTeam &&
      item.awayTeam === teams.awayTeam &&
      item.startTime === match.startTime,
  )
}

function getOddsSnapshot(match: Match, selection: BetSelection) {
  if (selection === 'home_win') return match.odds.homeWin
  if (selection === 'draw') return match.odds.draw
  return match.odds.awayWin
}

function getSimulationDistributionRatios(distribution: SimulationDistribution) {
  if (distribution === 'home_bias') {
    return { home_win: 0.6, draw: 0.2, away_win: 0.2 }
  }
  if (distribution === 'away_bias') {
    return { home_win: 0.2, draw: 0.2, away_win: 0.6 }
  }
  return { home_win: 0.34, draw: 0.33, away_win: 0.33 }
}

function allocateUsersByDistribution(totalUsers: number, distribution: SimulationDistribution) {
  const ratios = getSimulationDistributionRatios(distribution)
  const homeUsers = Math.floor(totalUsers * ratios.home_win)
  const drawUsers = Math.floor(totalUsers * ratios.draw)
  const awayUsers = Math.max(totalUsers - homeUsers - drawUsers, 0)
  return {
    home_win: homeUsers,
    draw: drawUsers,
    away_win: awayUsers,
  } as const
}

function getDominantSelectionByPending(matchId: string): BetSelection {
  const pending = getDb().betRecords.filter(
    (item) => item.matchId === matchId && item.status === 'pending',
  )
  const totals: Record<BetSelection, number> = {
    home_win: 0,
    draw: 0,
    away_win: 0,
  }
  for (const bet of pending) {
    totals[bet.selection] += bet.amount
  }
  return (['home_win', 'draw', 'away_win'] as const).reduce((prev, next) =>
    totals[next] > totals[prev] ? next : prev,
  )
}

function allocateUsersForRecovery(totalUsers: number, dominant: BetSelection) {
  const antiMajor = Math.floor(totalUsers * 0.45)
  const antiMinor = Math.floor(totalUsers * 0.45)
  const dominantUsers = Math.max(totalUsers - antiMajor - antiMinor, 0)
  if (dominant === 'home_win') {
    return { home_win: dominantUsers, draw: antiMajor, away_win: antiMinor } as const
  }
  if (dominant === 'draw') {
    return { home_win: antiMajor, draw: dominantUsers, away_win: antiMinor } as const
  }
  return { home_win: antiMajor, draw: antiMinor, away_win: dominantUsers } as const
}

function pickSimStakeUnit(preferred: number, allowed: number[]) {
  if (allowed.length === 0) return 0
  if (allowed.includes(preferred)) return preferred
  const sorted = [...allowed].sort((a, b) => a - b)
  const fallback = sorted.filter((value) => value <= preferred).at(-1)
  return fallback ?? sorted[0]
}

function injectSimulatedAggregateBet(
  match: Match,
  selection: BetSelection,
  users: number,
  amountPerUser: number,
) {
  if (users <= 0 || amountPerUser <= 0) return
  const simPlayer = ensureSimulationPlayer()
  const amount = money(users * amountPerUser)
  const oddsSnapshot = getOddsSnapshot(match, selection)
  const grossAmount = money(amount * oddsSnapshot)
  const feeAmount = money(amount * match.feeRate)
  const split = getFeeSplitRatio(match.feeSplitMode)
  const platformFeeAmount = money(feeAmount * split.platform)
  const agentFeeAmount = money(feeAmount - platformFeeAmount)
  const poolStake = money(amount - feeAmount)
  const netAmount = money(grossAmount - feeAmount)

  adjustBalance(simPlayer.id, -amount)
  writeBalanceLog(simPlayer.id, 'bet', -amount, match.id)

  adjustBalance(PLATFORM_USER_ID, platformFeeAmount)
  writeBalanceLog(PLATFORM_USER_ID, 'fee_income', platformFeeAmount, match.id)

  adjustBalance(match.agentId, agentFeeAmount)
  writeBalanceLog(match.agentId, 'fee_income', agentFeeAmount, match.id)

  adjustBalance(match.agentId, poolStake)
  writeBalanceLog(match.agentId, 'adjust', poolStake, match.id)

  const createdAt = nowIso()
  getDb().betRecords.unshift({
    id: generateId('bet'),
    matchId: match.id,
    playerId: simPlayer.id,
    selection,
    amount,
    oddsSnapshot,
    grossAmount,
    feeAmount,
    platformFeeAmount,
    agentFeeAmount,
    netAmount,
    status: 'pending',
    result: null,
    payoutAmount: 0,
    createdAt,
    settledAt: null,
  })
}

function stopBetSimulationTimer() {
  if (!betSimulationState.timer) return
  clearInterval(betSimulationState.timer)
  betSimulationState.timer = null
}

function runBetSimulationTick() {
  if (betSimulationState.status !== 'running' || !betSimulationState.matchId) return
  const match = getMatchById(betSimulationState.matchId)
  if (!match || ['cancelled', 'resolved'].includes(match.status)) {
    stopBetSimulationTimer()
    betSimulationState.status = 'completed'
    emitStoreChange()
    return
  }

  betSimulationState.elapsedSec += 1
  const targetProcessedUsers = Math.floor(
    (betSimulationState.userCount * betSimulationState.elapsedSec) / betSimulationState.durationSec,
  )
  const usersThisTick = Math.max(targetProcessedUsers - betSimulationState.processedUsers, 0)
  if (usersThisTick > 0) {
    const allowed = getAllowedBetAmountsForMatch(match.id)
    const fallbackOptions = getBetAmountOptions()
    const amountPerUser = pickSimStakeUnit(
      betSimulationState.averageAmount,
      allowed.length > 0 ? allowed : fallbackOptions,
    )
    betSimulationState.processedUsers += usersThisTick

    if (amountPerUser <= 0) {
      betSimulationState.skippedUsers += usersThisTick
    } else {
      const isRiskLocked = match.status === 'locked' && match.riskHalted
      const distributedUsers = isRiskLocked
        ? allocateUsersForRecovery(usersThisTick, getDominantSelectionByPending(match.id))
        : allocateUsersByDistribution(usersThisTick, betSimulationState.distribution)
      injectSimulatedAggregateBet(match, 'home_win', distributedUsers.home_win, amountPerUser)
      injectSimulatedAggregateBet(match, 'draw', distributedUsers.draw, amountPerUser)
      injectSimulatedAggregateBet(match, 'away_win', distributedUsers.away_win, amountPerUser)
      const placedUsers = distributedUsers.home_win + distributedUsers.draw + distributedUsers.away_win
      betSimulationState.placedUsers += placedUsers
      betSimulationState.totalStake = money(
        betSimulationState.totalStake + placedUsers * amountPerUser,
      )
      syncRiskControlForMatch(match.id)
    }
  }

  if (betSimulationState.elapsedSec >= betSimulationState.durationSec) {
    stopBetSimulationTimer()
    betSimulationState.status = 'completed'
  }
  emitStoreChange()
}

function getLockCountdownInfo(startTime: string) {
  const diff = new Date(startTime).getTime() - Date.now()
  const remainingMinutes = Math.max(Math.floor(diff / 60000), 0)
  const hours = Math.floor(remainingMinutes / 60)
  const mins = remainingMinutes % 60
  return {
    remainingMinutes,
    label: remainingMinutes <= 0 ? '00:00' : `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
  }
}

function toRiskLevel(matchStatus: MatchStatus, _maxRisk: number, _initialLiquidity: number) {
  if (matchStatus === 'locked') return 'paused' as const
  return 'low' as const
}

function settleBetByResult(match: Match, bet: BetRecord, result: MatchResult) {
  const won = bet.selection === result
  bet.status = won ? 'won' : 'lost'
  bet.result = result
  bet.payoutAmount = won ? bet.netAmount : 0
  bet.settledAt = nowIso()
  if (won && bet.payoutAmount > 0) {
    adjustBalance(match.agentId, -bet.payoutAmount)
    writeBalanceLog(match.agentId, 'adjust', -bet.payoutAmount, bet.id)
    adjustBalance(bet.playerId, bet.payoutAmount)
    writeBalanceLog(bet.playerId, 'payout', bet.payoutAmount, bet.id)
  }
}

export function getVisibleMatches(userId: string): Match[] {
  const user = requireUser(userId)
  const db = getDb()
  if (user.role === 'admin') return [...db.matches]
  if (user.role === 'agent') return db.matches.filter((match) => match.agentId === user.id)
  return db.matches.filter((match) => match.agentId === user.parentId)
}

export function getMatchById(matchId: string): Match | undefined {
  return getDb().matches.find((match) => match.id === matchId)
}

export function getPreMatchInfos() {
  return getDb().preMatchInfos.filter((item) => item.status === 'scheduled')
}

export function getPlatformMarkets() {
  return [...getDb().platformMarkets]
}

export function getUserById(userId: string) {
  return getDb().users.find((user) => user.id === userId)
}

export function getSimulateEligibleMatches() {
  return getDb()
    .matches.filter((match) => ['open', 'locked'].includes(match.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

export function getBetSimulationSnapshot(): BetSimulationSnapshot {
  return {
    status: betSimulationState.status,
    matchId: betSimulationState.matchId,
    userCount: betSimulationState.userCount,
    averageAmount: betSimulationState.averageAmount,
    durationSec: betSimulationState.durationSec,
    elapsedSec: betSimulationState.elapsedSec,
    processedUsers: betSimulationState.processedUsers,
    placedUsers: betSimulationState.placedUsers,
    skippedUsers: betSimulationState.skippedUsers,
    totalStake: betSimulationState.totalStake,
    distribution: betSimulationState.distribution,
  }
}

export function startBetSimulation(actorId: string, input: StartBetSimulationInput) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can run simulation')
  const match = requireMatch(input.matchId)
  if (!['open', 'locked'].includes(match.status)) {
    throw new Error('Simulation requires an active market')
  }

  stopBetSimulationTimer()
  betSimulationState.status = 'running'
  betSimulationState.matchId = input.matchId
  betSimulationState.userCount = input.userCount
  betSimulationState.averageAmount = input.averageAmount
  betSimulationState.durationSec = input.durationSec
  betSimulationState.elapsedSec = 0
  betSimulationState.processedUsers = 0
  betSimulationState.placedUsers = 0
  betSimulationState.skippedUsers = 0
  betSimulationState.totalStake = 0
  betSimulationState.distribution = input.distribution
  betSimulationState.timer = setInterval(runBetSimulationTick, 1000)
  emitStoreChange()
}

export function pauseBetSimulation(actorId: string) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can control simulation')
  if (betSimulationState.status !== 'running') return
  stopBetSimulationTimer()
  betSimulationState.status = 'paused'
  emitStoreChange()
}

export function resumeBetSimulation(actorId: string) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can control simulation')
  if (betSimulationState.status !== 'paused') return
  if (!betSimulationState.matchId) throw new Error('No simulation to resume')
  betSimulationState.status = 'running'
  betSimulationState.timer = setInterval(runBetSimulationTick, 1000)
  emitStoreChange()
}

export function stopBetSimulation(actorId: string) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can control simulation')
  if (!['running', 'paused'].includes(betSimulationState.status)) return
  stopBetSimulationTimer()
  betSimulationState.status = 'completed'
  emitStoreChange()
}

export function getBalanceLogsByUser(userId: string) {
  return getDb().balanceLogs.filter((item) => item.userId === userId)
}

export function getAdminPlatformStats() {
  const db = getDb()
  const totalBetAmount = db.betRecords.reduce((sum, item) => sum + item.amount, 0)
  const platformFeeIncome = db.balanceLogs
    .filter((item) => item.userId === PLATFORM_USER_ID && item.type === 'fee_income')
    .reduce((sum, item) => sum + item.amount, 0)
  const uniquePlayers = new Set(db.betRecords.map((item) => item.playerId))
  return {
    totalBetAmount: money(totalBetAmount),
    platformFeeIncome: money(platformFeeIncome),
    playerCount: uniquePlayers.size,
  }
}

export function getAdminTemplateTabs() {
  const templates = getDb().platformMarkets
  const templateIds = new Set(getDb().matches.map((item) => item.templateId))
  const settledTemplateIds = new Set(
    getDb()
      .matches.filter((item) =>
        getDb().betRecords.some((bet) => bet.matchId === item.id && bet.status !== 'pending'),
      )
      .map((item) => item.templateId),
  )
  return {
    created: templates.filter((item) => item.status === 'template'),
    activated: templates.filter((item) => templateIds.has(item.id)),
    settled: templates.filter((item) => settledTemplateIds.has(item.id)),
  }
}

export function removePlatformMarket(actorId: string, templateId: string) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can remove templates')
  const index = getDb().platformMarkets.findIndex((item) => item.id === templateId)
  if (index < 0) throw new Error('Template not found')
  const hasActivated = getDb().matches.some((match) => match.templateId === templateId)
  if (hasActivated) {
    throw new Error('Activated template cannot be removed')
  }
  getDb().platformMarkets.splice(index, 1)
  emitStoreChange()
}

export function getAdminCreatedTemplates() {
  return getDb().platformMarkets.filter((item) => item.status === 'template')
}

export function getAdminActivatedMarkets() {
  return getDb().matches
    .filter((match) => getDb().betRecords.some((bet) => bet.matchId === match.id))
    .map((match) => ({
      match,
      betCount: getDb().betRecords.filter((bet) => bet.matchId === match.id).length,
      totalBetAmount: money(
        getDb()
          .betRecords.filter((bet) => bet.matchId === match.id)
          .reduce((sum, bet) => sum + bet.amount, 0),
      ),
    }))
}

export function getAdminSettledMarketRecords() {
  return getDb().matches
    .filter((match) =>
      getDb().betRecords.some(
        (bet) => bet.matchId === match.id && ['won', 'lost', 'refunded'].includes(bet.status),
      ),
    )
    .map((match) => {
      const settledBets = getDb().betRecords.filter(
        (bet) => bet.matchId === match.id && ['won', 'lost', 'refunded'].includes(bet.status),
      )
      const platformFeeIncome = money(
        settledBets.reduce((sum, bet) => sum + bet.platformFeeAmount, 0),
      )
      const poolIncome = money(
        settledBets.reduce((sum, bet) => sum + (bet.amount - bet.feeAmount - bet.payoutAmount), 0),
      )
      const splitRatio = getFeeSplitRatio(match.feeSplitMode)
      const platformPoolIncome = money(poolIncome * splitRatio.platform)
      return {
        match,
        settledCount: settledBets.length,
        splitMode: match.feeSplitMode,
        platformSplitPercent: Math.round(splitRatio.platform * 100),
        platformFeeIncome,
        platformPoolIncome,
        totalIncome: money(platformFeeIncome + platformPoolIncome),
      }
    })
}

export function getAgentSettlementBills(agentId: string) {
  const agent = requireUser(agentId)
  if (agent.role !== 'agent') return []
  return getDb().matches
    .filter((match) => match.agentId === agentId)
    .map((match) => {
      const settledBets = getDb().betRecords.filter(
        (bet) => bet.matchId === match.id && ['won', 'lost', 'refunded'].includes(bet.status),
      )
      if (settledBets.length === 0) return null
      const feeIncome = money(settledBets.reduce((sum, bet) => sum + bet.agentFeeAmount, 0))
      const poolIncome = money(
        settledBets.reduce((sum, bet) => sum + (bet.amount - bet.feeAmount - bet.payoutAmount), 0),
      )
      return {
        match,
        settledCount: settledBets.length,
        feeIncome,
        poolIncome,
        netIncome: money(feeIncome + poolIncome),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => new Date(b.match.startTime).getTime() - new Date(a.match.startTime).getTime())
}

export function getMatchBetSummary(matchId: string) {
  const bets = getDb().betRecords.filter((item) => item.matchId === matchId)
  const total = bets.reduce((sum, item) => sum + item.amount, 0)
  const grouped = {
    home_win: { users: new Set<string>(), amount: 0, projectedPayout: 0 },
    draw: { users: new Set<string>(), amount: 0, projectedPayout: 0 },
    away_win: { users: new Set<string>(), amount: 0, projectedPayout: 0 },
  }

  for (const bet of bets) {
    grouped[bet.selection].users.add(bet.playerId)
    grouped[bet.selection].amount += bet.amount
    grouped[bet.selection].projectedPayout += bet.netAmount
  }

  return {
    totalAmount: money(total),
    options: (['home_win', 'draw', 'away_win'] as const).map((key) => ({
      key,
      users: grouped[key].users.size,
      amount: money(grouped[key].amount),
      percent: total > 0 ? money((grouped[key].amount / total) * 100) : 0,
      projectedRevenue: money(total - grouped[key].projectedPayout),
    })),
  }
}

export function getMatchOperationalSnapshot(matchId: string) {
  const match = requireMatch(matchId)
  const riskControl = computeRiskControl(match)
  const summary = getMatchBetSummary(matchId)
  const projectedRisk = money(
    Math.max(
      ...summary.options.map((item) => Math.max(-item.projectedRevenue, 0)),
      0,
    ),
  )
  const maxRisk = money(Math.max(projectedRisk, match.maxRisk))
  const maxProfit = money(
    Math.max(...summary.options.map((item) => Math.max(item.projectedRevenue, 0)), 0),
  )
  const riskLevel = toRiskLevel(match.status, maxRisk, match.initialLiquidity)
  const poolTotal = money(match.poolLocked)
  const releasedRatio =
    match.status === 'cancelled' || match.status === 'resolved'
      ? 1
      : money(riskControl.releasedPool / Math.max(poolTotal, 1))
  const pre = findPreMatchByMatch(match)
  const teams = splitTeams(match.title)
  const logos = {
    homeLogoUrl: asString(pre?.rawData.homeLogoUrl),
    awayLogoUrl: asString(pre?.rawData.awayLogoUrl),
  }

  return {
    teams,
    logos,
    odds: match.odds,
    riskControl,
    lockCountdown: getLockCountdownInfo(match.startTime),
    maxRisk,
    maxProfit,
    riskLevel,
    poolTotal,
    releasedPool:
      match.status === 'cancelled' || match.status === 'resolved'
        ? poolTotal
        : riskControl.releasedPool,
    releasedRatio,
    totalBetAmount: summary.totalAmount,
    feeIncome: money(
      getDb()
        .betRecords.filter((item) => item.matchId === matchId)
        .reduce((sum, item) => sum + item.agentFeeAmount, 0),
    ),
    outcomeProjection: summary.options,
  }
}

export function getActiveMarketsForAgent(agentId: string) {
  const agent = requireUser(agentId)
  if (agent.role !== 'agent') return []
  return getDb()
    .matches.filter(
      (match) =>
        match.agentId === agentId &&
        (match.status === 'open' || match.status === 'locked'),
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((match) => {
      const snapshot = getMatchOperationalSnapshot(match.id)
      return {
        id: match.id,
        title: match.title,
        startTime: match.startTime,
        homeTeam: snapshot.teams.homeTeam,
        awayTeam: snapshot.teams.awayTeam,
        homeLogoUrl: snapshot.logos.homeLogoUrl,
        awayLogoUrl: snapshot.logos.awayLogoUrl,
        lockCountdownLabel: snapshot.lockCountdown.label,
        totalBetAmount: snapshot.totalBetAmount,
        maxProfit: snapshot.maxProfit,
        maxRisk: snapshot.maxRisk,
        riskLevel: snapshot.riskLevel,
        status: match.status,
      }
    })
}

export function getAgentCreateStats(agentId: string) {
  const matches = getDb().matches.filter((item) => item.agentId === agentId)
  const matchIds = new Set(matches.map((item) => item.id))
  const bets = getDb().betRecords.filter((item) => matchIds.has(item.matchId))
  const totalBetAmount = bets.reduce((sum, item) => sum + item.amount, 0)
  const totalPayoutAmount = bets.reduce((sum, item) => sum + item.payoutAmount, 0)
  const feeIncome = bets.reduce((sum, item) => sum + item.agentFeeAmount, 0)
  const poolPnl = money(totalBetAmount - totalPayoutAmount - feeIncome)
  const netProfit = money(poolPnl + feeIncome)
  const poolProfit = poolPnl > 0 ? poolPnl : 0
  const poolLoss = poolPnl < 0 ? Math.abs(poolPnl) : 0
  const activeMatches = matches.filter((item) =>
    ['open', 'locked'].includes(item.status),
  ).length
  return {
    netProfit: money(netProfit),
    feeIncome: money(feeIncome),
    poolProfit: money(poolProfit),
    poolLoss: money(poolLoss),
    activeMatches,
  }
}

export function createPlatformMarket(actorId: string, input: CreatePlatformMarketInput) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can create templates')
  const pre = getDb().preMatchInfos.find((item) => item.id === input.preMatchInfoId)
  if (!pre) throw new Error('Pre-match info not found')
  if (isExpired(pre.startTime)) throw new Error('Match start time has passed')
  const duplicateTemplate = getDb().platformMarkets.some(
    (item) =>
      item.status === 'template' &&
      item.matchInfo.homeTeam === pre.homeTeam &&
      item.matchInfo.awayTeam === pre.awayTeam &&
      item.matchInfo.startTime === pre.startTime,
  )
  if (duplicateTemplate) throw new Error('Template for this match already exists')
  const template: PlatformMarket = {
    id: generateId('tpl'),
    matchInfo: {
      homeTeam: pre.homeTeam,
      awayTeam: pre.awayTeam,
      startTime: pre.startTime,
    },
    lockTime: input.lockTime,
    feeSplitMode: input.feeSplitMode,
    feeRate: money(input.feeRate / 100),
    riskLevel: input.riskLevel,
    poolRequirement: money(input.poolRequirement),
    status: 'template',
    createdBy: actorId,
    createdAt: nowIso(),
  }
  getDb().platformMarkets.unshift(template)
  emitStoreChange()
  return template
}

export function activatePlatformMarket(agentId: string, templateId: string) {
  const agent = requireUser(agentId)
  if (agent.role !== 'agent') throw new Error('Only agent can activate market')
  const template = requireTemplate(templateId)
  if (template.status !== 'template') throw new Error('Template is not available')
  if (isExpired(template.matchInfo.startTime)) {
    throw new Error('Template has expired and cannot be activated')
  }
  const hasActiveTemplate = getDb().matches.some(
    (item) =>
      item.agentId === agentId &&
      item.templateId === templateId &&
      ['draft', 'open', 'locked'].includes(item.status),
  )
  if (hasActiveTemplate) throw new Error('This template is already activated by current agent')
  if (agent.balance < template.poolRequirement) throw new Error('Insufficient agent balance')
  const pre = getDb().preMatchInfos.find(
    (item) =>
      item.homeTeam === template.matchInfo.homeTeam &&
      item.awayTeam === template.matchInfo.awayTeam &&
      item.startTime === template.matchInfo.startTime,
  )
  if (!pre) throw new Error('Cannot find odds source from pre-match data')

  adjustBalance(agent.id, -template.poolRequirement)
  writeBalanceLog(agent.id, 'pool_freeze', -template.poolRequirement, template.id)

  const match: Match = {
    id: generateId('match'),
    templateId: template.id,
    agentId: agent.id,
    marketId: pre.marketId,
    title: `${template.matchInfo.homeTeam} vs ${template.matchInfo.awayTeam}`,
    startTime: template.matchInfo.startTime,
    poolLocked: template.poolRequirement,
    initialLiquidity: template.poolRequirement,
    maxRisk: template.poolRequirement,
    feeSplitMode: template.feeSplitMode,
    odds: {
      homeWin: pre.odds.homeWin,
      draw: pre.odds.draw,
      awayWin: pre.odds.awayWin,
    },
    baseOdds: {
      homeWin: pre.odds.homeWin,
      draw: pre.odds.draw,
      awayWin: pre.odds.awayWin,
    },
    feeRate: template.feeRate,
    riskHalted: false,
    status: 'open',
    result: null,
    createdAt: nowIso(),
    resolvedAt: null,
    resolvedBy: null,
  }
  getDb().matches.unshift(match)
  syncRiskControlForMatch(match.id)
  emitStoreChange()
  return match
}

export function createMatchFromPreMatchInfo(input: CreateMatchInput) {
  const actor = requireUser(input.agentId)
  if (actor.role !== 'agent') throw new Error('Only agent can create match')
  const pre = getDb().preMatchInfos.find((item) => item.id === input.preMatchInfoId)
  if (!pre) throw new Error('Pre-match info not found')
  const template = createPlatformMarket(PLATFORM_USER_ID, {
    preMatchInfoId: input.preMatchInfoId,
    lockTime: 10,
    feeSplitMode: '55',
    feeRate: input.feeRate ?? 2,
    riskLevel: 'medium',
    poolRequirement: input.initialLiquidity,
  })
  return activatePlatformMarket(input.agentId, template.id)
}

export function placeBetsAtomic(playerId: string, slips: BetSlipItem[]) {
  if (slips.length === 0) throw new Error('No bets selected')

  const player = requireUser(playerId)
  assertActiveUser(player)
  if (player.role !== 'player') throw new Error('Only player can place bet')

  let totalAmount = 0
  for (const slip of slips) {
    if (!slip.amount) throw new Error('Please select bet amount for all slips')
    const match = requireMatch(slip.matchId)
    if (match.status !== 'open') throw new Error('One or more selected matches are no longer open')
    const riskControl = computeRiskControl(match)
    if (riskControl.haltedByRisk || riskControl.allowedBetAmounts.length === 0) {
      throw new Error('Market is temporarily halted by risk control')
    }
    if (!riskControl.allowedBetAmounts.includes(slip.amount)) {
      throw new Error(
        `This market currently allows only ${riskControl.allowedBetAmounts.join('/')} U`,
      )
    }
    if (player.parentId !== match.agentId) throw new Error('Player cannot bet on this match')
    totalAmount += slip.amount
  }
  if (player.balance < totalAmount) throw new Error('Insufficient player balance')

  const now = nowIso()
  const created: BetRecord[] = []
  const touchedMatchIds = new Set<string>()
  for (const slip of slips) {
    const amount = slip.amount as number
    const match = requireMatch(slip.matchId)
    const oddsSnapshot = getOddsSnapshot(match, slip.selection)
    const grossAmount = money(amount * oddsSnapshot)
    const feeAmount = money(amount * match.feeRate)
    const split = getFeeSplitRatio(match.feeSplitMode)
    const platformFeeAmount = money(feeAmount * split.platform)
    const agentFeeAmount = money(feeAmount - platformFeeAmount)
    const poolStake = money(amount - feeAmount)
    const netAmount = money(grossAmount - feeAmount)

    adjustBalance(player.id, -amount)
    writeBalanceLog(player.id, 'bet', -amount, match.id)

    adjustBalance(PLATFORM_USER_ID, platformFeeAmount)
    writeBalanceLog(PLATFORM_USER_ID, 'fee_income', platformFeeAmount, match.id)

    adjustBalance(match.agentId, agentFeeAmount)
    writeBalanceLog(match.agentId, 'fee_income', agentFeeAmount, match.id)

    adjustBalance(match.agentId, poolStake)
    writeBalanceLog(match.agentId, 'adjust', poolStake, match.id)

    const bet: BetRecord = {
      id: generateId('bet'),
      matchId: match.id,
      playerId: player.id,
      selection: slip.selection,
      amount,
      oddsSnapshot,
      grossAmount,
      feeAmount,
      platformFeeAmount,
      agentFeeAmount,
      netAmount,
      status: 'pending',
      result: null,
      payoutAmount: 0,
      createdAt: now,
      settledAt: null,
    }
    getDb().betRecords.unshift(bet)
    created.push(bet)
    touchedMatchIds.add(match.id)
  }
  touchedMatchIds.forEach((matchId) => syncRiskControlForMatch(matchId))
  emitStoreChange()
  return created
}

export function updateMarketStatus(
  actorId: string,
  matchId: string,
  nextStatus: Exclude<MatchStatus, 'resolved'>,
) {
  const actor = requireUser(actorId)
  const match = requireMatch(matchId)
  const canAdmin = actor.role === 'admin'
  const canAgentOwn = actor.role === 'agent' && match.agentId === actor.id
  if (!canAdmin && !canAgentOwn) throw new Error('No permission to update this match')
  assertCanTransition(match.status, nextStatus)
  match.status = nextStatus
  if (nextStatus !== 'locked') {
    match.riskHalted = false
  }
  syncRiskControlForMatch(match.id)
  emitStoreChange()
  return match
}

export function changeMatchStatusByAdmin(
  actorId: string,
  matchId: string,
  nextStatus: Exclude<MatchStatus, 'resolved'>,
) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can change arbitrary status')
  return updateMarketStatus(actorId, matchId, nextStatus)
}

export function pauseMatchByAgent(actorId: string, matchId: string) {
  return updateMarketStatus(actorId, matchId, 'locked')
}

export function cancelMatch(actorId: string, matchId: string) {
  const updated = updateMarketStatus(actorId, matchId, 'cancelled')
  const pendingBets = getDb().betRecords.filter(
    (bet) => bet.matchId === updated.id && bet.status === 'pending',
  )
  for (const bet of pendingBets) {
    bet.status = 'refunded'
    bet.result = null
    bet.payoutAmount = bet.amount
    bet.settledAt = nowIso()
    adjustBalance(bet.playerId, bet.amount)
    writeBalanceLog(bet.playerId, 'payout', bet.amount, bet.id)

    adjustBalance(PLATFORM_USER_ID, -bet.platformFeeAmount)
    writeBalanceLog(PLATFORM_USER_ID, 'adjust', -bet.platformFeeAmount, bet.id)

    adjustBalance(updated.agentId, -(bet.agentFeeAmount + (bet.amount - bet.feeAmount)))
    writeBalanceLog(updated.agentId, 'adjust', -(bet.agentFeeAmount + (bet.amount - bet.feeAmount)), bet.id)
  }
  adjustBalance(updated.agentId, updated.poolLocked)
  writeBalanceLog(updated.agentId, 'pool_unfreeze', updated.poolLocked, updated.id)
  emitStoreChange()
  return updated
}

export function resolveMatchByAdmin(actorId: string, matchId: string, result: MatchResult) {
  const actor = requireUser(actorId)
  if (actor.role !== 'admin') throw new Error('Only admin can resolve match')
  const match = requireMatch(matchId)
  if (!['open', 'locked'].includes(match.status)) {
    throw new Error('Only open or locked match can be resolved')
  }

  match.status = 'open'
  match.riskHalted = false
  match.result = result
  match.resolvedAt = nowIso()
  match.resolvedBy = actor.id
  const pendingBets = getDb().betRecords.filter(
    (bet) => bet.matchId === match.id && bet.status === 'pending',
  )
  pendingBets.forEach((bet) => settleBetByResult(match, bet, result))
  syncRiskControlForMatch(match.id)
  emitStoreChange()
  return match
}

export function resolveMarketsByAdmin(
  actorId: string,
  selections: Array<{ matchId: string; result: MatchResult }>,
) {
  if (selections.length === 0) throw new Error('Please choose at least one match result')
  selections.forEach((item) => resolveMatchByAdmin(actorId, item.matchId, item.result))
  emitStoreChange()
}

export function getLockedMatchesForAdmin() {
  return getDb().matches
    .filter((match) => ['open', 'locked'].includes(match.status))
    .filter((match) =>
      getDb().betRecords.some((bet) => bet.matchId === match.id && bet.status === 'pending'),
    )
    .map((match) => ({
      match,
      summary: getMatchBetSummary(match.id),
    }))
}

export function getPlayerBetRecords(playerId: string) {
  return getDb()
    .betRecords.filter((item) => item.playerId === playerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
