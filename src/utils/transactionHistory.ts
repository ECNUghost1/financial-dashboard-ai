import type { FinancialRecord, TransactionHistory, InterestPeriod, TransactionType } from '../types';

const INTEREST_SETTLEMENT_HOUR = 8;

const getSettlementDate = (date: Date): Date => {
  const utc8Hour = date.getUTCHours() + 8;
  if (utc8Hour < INTEREST_SETTLEMENT_HOUR) {
    const settlementDate = new Date(date);
    settlementDate.setDate(settlementDate.getDate() - 1);
    return settlementDate;
  }
  return date;
};

const calculateDays = (startDate: Date, endDate: Date): number => {
  const settlementStart = getSettlementDate(startDate);
  const settlementEnd = getSettlementDate(endDate);
  
  if (settlementStart >= settlementEnd) {
    return 0;
  }
  
  const diffTime = settlementEnd.getTime() - settlementStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

export const calculateInterestForPeriod = (
  principal: number,
  rate: number,
  startDate: Date,
  endDate: Date
): number => {
  const days = calculateDays(startDate, endDate);
  return principal * rate / 100 * days / 365;
};

export const generateInterestPeriods = (
  record: FinancialRecord,
  transactions: TransactionHistory[]
): InterestPeriod[] => {
  const periods: InterestPeriod[] = [];
  
  const startDate = new Date(record.start_date);
  const now = new Date();
  
  // 确定最终结束日期：
  // 1. 如果有赎回日期，用赎回日期
  // 2. 如果当前时间小于截止日期，用当前时间（未到期）
  // 3. 如果当前时间大于等于截止日期，用截止日期（已到期）
  // 4. 长期持有或无截止日期，用当前时间
  let endDate: Date;
  if (record.redemption_date) {
    endDate = new Date(record.redemption_date);
  } else if (record.end_date && !record.is_long_term) {
    const recordEndDate = new Date(record.end_date);
    // 当前时间小于截止日期，用当前时间；否则用截止日期
    endDate = now < recordEndDate ? now : recordEndDate;
  } else {
    endDate = now;
  }
  
  if (startDate >= endDate) {
    return periods;
  }
  
  const sortedTransactions = [...transactions]
    .filter(t => new Date(t.effective_date) <= endDate)
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
  
  // 使用初始本金和利率作为阶段1的值
  let currentPrincipal = record.initial_principal || record.principal;
  let currentRate = record.initial_interest_rate || record.interest_rate;
  let periodStart = startDate;
  
  const eventPoints: { date: Date; type: TransactionType; value: number }[] = [];
  
  sortedTransactions.forEach(t => {
    eventPoints.push({
      date: new Date(t.effective_date),
      type: t.type,
      value: t.new_value
    });
  });
  
  eventPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  eventPoints.forEach(event => {
    if (event.date > periodStart && event.date <= endDate) {
      const periodEnd = event.date;
      const days = calculateDays(periodStart, periodEnd);
      
      if (days > 0) {
        periods.push({
          start_date: new Date(periodStart),
          end_date: new Date(periodEnd),
          principal: currentPrincipal,
          rate: currentRate,
          days,
          interest: calculateInterestForPeriod(currentPrincipal, currentRate, periodStart, periodEnd)
        });
      }
      
      if (event.type === 'principal') {
        currentPrincipal = event.value;
      } else {
        currentRate = event.value;
      }
      
      periodStart = periodEnd;
    }
  });
  
  if (periodStart < endDate) {
    const days = calculateDays(periodStart, endDate);
    if (days > 0) {
      periods.push({
        start_date: new Date(periodStart),
        end_date: new Date(endDate),
        principal: currentPrincipal,
        rate: currentRate,
        days,
        interest: calculateInterestForPeriod(currentPrincipal, currentRate, periodStart, endDate)
      });
    }
  }
  
  return periods;
};

export const calculateTotalInterestWithHistory = (
  record: FinancialRecord,
  transactions: TransactionHistory[]
): number => {
  const periods = generateInterestPeriods(record, transactions);
  return periods.reduce((total, period) => total + period.interest, 0);
};

export const createTransaction = (
  recordId: string,
  type: TransactionType,
  oldValue: number,
  newValue: number,
  effectiveDate?: string
): Omit<TransactionHistory, 'id' | 'created_at'> => {
  return {
    record_id: recordId,
    type,
    old_value: oldValue,
    new_value: newValue,
    effective_date: effectiveDate || new Date().toISOString()
  };
};
