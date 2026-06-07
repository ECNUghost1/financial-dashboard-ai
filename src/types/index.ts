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
  initial_principal: number;
  initial_interest_rate: number;
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
