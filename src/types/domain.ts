export type UserRole = 'agent' | 'player' | 'admin'
export type UserStatus = 'active' | 'disabled'

export type MatchStatus = 'draft' | 'open' | 'locked' | 'resolved' | 'cancelled'
export type MatchResult = 'home_win' | 'draw' | 'away_win'
export type BetSelection = MatchResult

export type BalanceLogType =
  | 'create_match'
  | 'bet'
  | 'payout'
  | 'adjust'
  | 'pool_freeze'
  | 'pool_unfreeze'
  | 'fee_income'

export type PreMatchStatus = 'scheduled' | 'cancelled'
export type FeeSplitMode = '55' | '46' | '37'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface User {
  id: string
  role: UserRole
  parentId: string | null
  inviteCode: string
  walletAddress: string | null
  balance: number
  status: UserStatus
  createdAt: string
}

export interface Market {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export interface PlatformMarket {
  id: string
  matchInfo: {
    homeTeam: string
    awayTeam: string
    startTime: string
  }
  lockTime: number
  feeSplitMode: FeeSplitMode
  feeRate: number
  riskLevel: RiskLevel
  poolRequirement: number
  status: 'template' | 'disabled'
  createdBy: string
  createdAt: string
}

export interface Match {
  id: string
  templateId: string
  agentId: string
  marketId: string
  title: string
  startTime: string
  poolLocked: number
  initialLiquidity: number
  maxRisk: number
  feeSplitMode: FeeSplitMode
  odds: {
    homeWin: number
    draw: number
    awayWin: number
  }
  baseOdds: {
    homeWin: number
    draw: number
    awayWin: number
  }
  feeRate: number
  riskHalted: boolean
  status: MatchStatus
  result: MatchResult | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface BetRecord {
  id: string
  matchId: string
  playerId: string
  selection: BetSelection
  amount: number
  oddsSnapshot: number
  grossAmount: number
  feeAmount: number
  platformFeeAmount: number
  agentFeeAmount: number
  netAmount: number
  status: 'pending' | 'won' | 'lost' | 'refunded'
  result: MatchResult | null
  payoutAmount: number
  createdAt: string
  settledAt: string | null
}

export interface BalanceLog {
  id: string
  userId: string
  type: BalanceLogType
  amount: number
  balanceAfter: number
  refId: string | null
  createdAt: string
}

export interface PreMatchInfo {
  id: string
  externalId: string
  homeTeam: string
  awayTeam: string
  startTime: string
  marketId: string
  status: PreMatchStatus
  odds: {
    homeWin: number
    draw: number
    awayWin: number
  }
  rawData: Record<string, unknown>
}

export interface MockDatabase {
  users: User[]
  markets: Market[]
  platformMarkets: PlatformMarket[]
  matches: Match[]
  betRecords: BetRecord[]
  balanceLogs: BalanceLog[]
  preMatchInfos: PreMatchInfo[]
  settings: {
    betAmountOptions: number[]
  }
}
