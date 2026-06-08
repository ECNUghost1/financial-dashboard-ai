import type { Countdown, InterestCalculation, FinancialRecord, TransactionHistory } from '../types';

// 每天利息结算时间（UTC+8 早上8点）
const INTEREST_SETTLEMENT_HOUR = 8;

export const calculateDailyInterest = (principal: number, rate: number): number => {
  return principal * rate / 100 / 365;
};

export const calculateMonthlyInterest = (principal: number, rate: number): number => {
  return principal * rate / 100 / 12;
};

// 获取考虑8点分界线的结算日期（UTC时间版本）
// 早上8点之前，计息日属于前一天；8点之后，计息日属于当天
// 注意：date参数应该是UTC时间
export const getSettlementDate = (date: Date): Date => {
  // 转换为UTC+8时间
  const utc8Hour = date.getUTCHours() + 8;
  
  // 如果UTC+8时间还没到8点，则实际计息日是前一天
  if (utc8Hour < INTEREST_SETTLEMENT_HOUR) {
    const settlementDate = new Date(date);
    settlementDate.setDate(settlementDate.getDate() - 1);
    return settlementDate;
  }
  
  return date;
};

// 获取考虑8点分界线的结算日期（本地时间版本）
// 早上8点之前，计息日属于前一天；8点之后，计息日属于当天
// 注意：date参数应该是本地时间
export const getSettlementDateLocal = (date: Date): Date => {
  // 使用本地时间判断
  const localHour = date.getHours();
  
  // 如果本地时间还没到8点，则实际计息日是前一天
  if (localHour < INTEREST_SETTLEMENT_HOUR) {
    const settlementDate = new Date(date);
    settlementDate.setDate(settlementDate.getDate() - 1);
    return settlementDate;
  }
  
  return date;
};

// 计算两个日期之间的实际计息天数（考虑8点分界线）
const calculateInterestDays = (startDate: Date, endDate: Date): number => {
  const settlementStart = getSettlementDate(startDate);
  const settlementEnd = getSettlementDate(endDate);
  
  // 如果开始日期的结算日 >= 结束日期的结算日，返回0
  if (settlementStart >= settlementEnd) {
    return 0;
  }
  
  // 计算天数差
  const diffTime = settlementEnd.getTime() - settlementStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

export const calculateAnnualizedInterest = (
  principal: number,
  rate: number,
  startDate: string,
  redemptionDate?: string
): number => {
  const start = new Date(startDate);
  const end = redemptionDate ? new Date(redemptionDate) : new Date();
  const days = calculateInterestDays(start, end);
  return principal * rate / 100 * days / 365;
};

// 计算累计收益（考虑赎回日期，以及8点分界线）
// 截止日期仅用于判断是否到期，不影响收益计算
// 收益 = 本金 × 年利率 × 实际计息天数 / 365
// 实际计息天数 = 从开始日期到当前日期（或赎回日期）的天数，按8点分界线判断
export const calculateAccumulatedInterest = (record: FinancialRecord): number => {
  const start = new Date(record.start_date);
  let end: Date;
  
  if (record.redemption_date) {
    // 已赎回，计算到赎回日期
    end = new Date(record.redemption_date);
  } else {
    // 未赎回，计算到当前时间（不考虑截止日期）
    end = new Date();
  }
  
  const days = calculateInterestDays(start, end);
  return record.principal * record.interest_rate / 100 * days / 365;
};

// 判断记录是否已到期或已赎回
export const isRecordExpiredOrRedeemed = (record: FinancialRecord): boolean => {
  // 如果有赎回日期，则视为已赎回
  if (record.redemption_date) return true;
  
  // 如果是长期持有，则未到期
  if (record.is_long_term) return false;
  
  // 如果有截止日期且已过期，则视为已到期
  if (record.end_date) {
    return new Date(record.end_date) < new Date();
  }
  
  return false;
};

export const getCountdown = (endDate: string): Countdown => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

export const isNearExpiration = (endDate: string, days: number = 7): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
  return daysDiff > 0 && daysDiff <= days;
};

export const isExpired = (endDate: string): boolean => {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  });
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateAllInterests = (
  principal: number,
  rate: number,
  startDate: string,
  redemptionDate?: string
): InterestCalculation => {
  return {
    daily: calculateDailyInterest(principal, rate),
    monthly: calculateMonthlyInterest(principal, rate),
    annualized: calculateAnnualizedInterest(principal, rate, startDate, redemptionDate),
  };
};

// 计算带交易历史的累计收益（分段计算）
export const calculateAccumulatedInterestWithTransactions = (
  record: FinancialRecord,
  transactions: TransactionHistory[]
): number => {
  // 如果没有交易历史，使用原来的简单计算
  if (!transactions || transactions.length === 0) {
    return calculateAccumulatedInterest(record);
  }
  
  // 有交易历史，使用分段计算
  const startDate = new Date(record.start_date);
  const now = new Date();
  
  // 确定结束日期
  let endDate: Date;
  if (record.redemption_date) {
    endDate = new Date(record.redemption_date);
  } else if (record.end_date && !record.is_long_term) {
    const recordEndDate = new Date(record.end_date);
    endDate = now < recordEndDate ? now : recordEndDate;
  } else {
    endDate = now;
  }
  
  if (startDate >= endDate) {
    return 0;
  }
  
  // 按生效日期排序交易历史
  const sortedTransactions = [...transactions]
    .filter(t => new Date(t.effective_date) <= endDate)
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
  
  // 使用初始本金和利率
  let currentPrincipal = record.initial_principal || record.principal;
  let currentRate = record.initial_interest_rate || record.interest_rate;
  let periodStart = startDate;
  let totalInterest = 0;
  
  // 计算每个阶段的收益
  for (const transaction of sortedTransactions) {
    const periodEnd = new Date(transaction.effective_date);
    if (periodEnd > periodStart && periodEnd <= endDate) {
      const days = calculateInterestDays(periodStart, periodEnd);
      const periodInterest = currentPrincipal * currentRate / 100 * days / 365;
      totalInterest += periodInterest;
      
      // 更新本金或利率
      if (transaction.type === 'principal') {
        currentPrincipal = transaction.new_value;
      } else if (transaction.type === 'rate') {
        currentRate = transaction.new_value;
      }
      
      periodStart = periodEnd;
    }
  }
  
  // 计算最后一个阶段的收益（从最后一个变更到结束日期）
  if (periodStart < endDate) {
    const days = calculateInterestDays(periodStart, endDate);
    const periodInterest = currentPrincipal * currentRate / 100 * days / 365;
    totalInterest += periodInterest;
  }
  
  return totalInterest;
};
