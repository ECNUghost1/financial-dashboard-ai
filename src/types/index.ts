export interface User {
  id: string;
  email: string;
  password?: string; // Supabase 认证不返回密码，改为可选
  username?: string;
  created_at: string;
}

export type CurrencyType = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD';

export interface FinancialRecord {
  id: string;
  user_id: string;
  platform: string;
  principal: number;
  interest_rate: number;
  currency: CurrencyType;
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
