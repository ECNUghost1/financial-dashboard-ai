export interface User {
  id: string;
  email: string;
  password?: string; // Supabase 认证不返回密码，改为可选
  username?: string;
  created_at: string;
}

export type CurrencyType = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD';

// 等价物类型（本金类型）
export type AssetType = 'BTC' | 'USDT' | 'USD1' | 'USDC' | 'U' | 'XAUT';

export const ASSET_TYPES: AssetType[] = [
  'BTC',
  'USDT',
  'USD1',
  'USDC',
  'U',
  'XAUT',
];

export type PlatformTag = 
  | '币安交易所' 
  | '币安钱包' 
  | 'OK交易所' 
  | 'OK钱包' 
  | 'BG交易所' 
  | 'BG钱包' 
  | 'GATE交易所' 
  | 'GATE钱包' 
  | 'BYBIT交易所' 
  | 'BYBIT钱包';

export const PLATFORM_TAGS: PlatformTag[] = [
  '币安交易所',
  '币安钱包',
  'OK交易所',
  'OK钱包',
  'BG交易所',
  'BG钱包',
  'GATE交易所',
  'GATE钱包',
  'BYBIT交易所',
  'BYBIT钱包',
];

export interface FinancialRecord {
  id: string;
  user_id: string;
  platform: string;
  platform_tag?: PlatformTag;
  principal: number;
  interest_rate: number;
  initial_principal: number;
  initial_interest_rate: number;
  currency: CurrencyType;
  asset_type: AssetType; // 等价物类型（BTC, USDT, USD1, USDC, U, XAUT）
  start_date: string;
  end_date?: string;
  is_long_term: boolean;
  redemption_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface InterestCalculation {
  daily: number;
  monthly: number;
  annualized: number;
}

export interface RecordSummary {
  totalPrincipal: number;
  totalPrincipalCNY: number;
  totalPrincipalUSD: number;
  totalDailyInterest: number;
  totalDailyInterestCNY: number;
  totalDailyInterestUSD: number;
  totalMonthlyInterest: number;
  totalMonthlyInterestCNY: number;
  totalMonthlyInterestUSD: number;
  totalAnnualizedInterest: number;
  totalAnnualizedInterestCNY: number;
  totalAnnualizedInterestUSD: number;
  totalAccumulatedInterest: number;
  totalAccumulatedInterestCNY: number;
  totalAccumulatedInterestUSD: number;
  upcomingExpirations: number;
}

export interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  HKD: number;
  CNY: number;
}

export type TransactionType = 'principal' | 'rate';

export interface TransactionHistory {
  id: string;
  record_id: string;
  type: TransactionType;
  old_value: number;
  new_value: number;
  effective_date: string;
  created_at: string;
}

export interface InterestPeriod {
  start_date: Date;
  end_date: Date;
  principal: number;
  rate: number;
  days: number;
  interest: number;
}

export interface RecordHistoryView {
  record: FinancialRecord;
  transactions: TransactionHistory[];
  periods: InterestPeriod[];
  totalInterest: number;
}
