import { useState, useEffect } from 'react';
import type { FinancialRecord, RecordSummary, ExchangeRates } from '../types';
import { calculateDailyInterest, calculateMonthlyInterest, calculateAnnualizedInterest, calculateAccumulatedInterest, isNearExpiration, isRecordExpiredOrRedeemed } from '../utils/calculations';
import { fetchExchangeRates, convertToCNY, convertToUSD } from '../utils/exchangeRate';

const STORAGE_KEY = 'financial_records';

export const useRecords = (userId: string | null) => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    if (!userId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      const allRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const userRecords = allRecords.filter((r: FinancialRecord) => r.user_id === userId);
      // 为旧记录添加默认货币类型
      const recordsWithCurrency = userRecords.map((r: FinancialRecord) => ({
        ...r,
        currency: r.currency || 'CNY' as const,
      }));
      
      // 自动赎回超过截止日期的记录
      const now = new Date();
      const updatedRecords = recordsWithCurrency.map((r: FinancialRecord) => {
        // 如果已经有赎回日期，跳过
        if (r.redemption_date) return r;
        // 如果是长期持有，跳过
        if (r.is_long_term) return r;
        // 如果没有截止日期，跳过
        if (!r.end_date) return r;
        
        // 如果截止日期已过，自动设置赎回日期为截止日期
        const endDate = new Date(r.end_date);
        if (endDate < now) {
          return {
            ...r,
            redemption_date: r.end_date, // 赎回日期设为截止日期
            updated_at: new Date().toISOString(),
          };
        }
        return r;
      });
      
      // 如果有记录被自动赎回，保存到localStorage
      const hasAutoRedeemed = updatedRecords.some((r: FinancialRecord, i: number) => 
        r.redemption_date !== recordsWithCurrency[i].redemption_date
      );
      
      if (hasAutoRedeemed) {
        const otherUsersRecords = allRecords.filter((r: FinancialRecord) => r.user_id !== userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherUsersRecords, ...updatedRecords]));
      }
      
      setRecords(updatedRecords);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, [userId]);

  // 获取汇率数据
  useEffect(() => {
    const loadRates = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    loadRates();
  }, []);

  const saveRecords = (newRecords: FinancialRecord[]) => {
    try {
      const allRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const otherUsersRecords = allRecords.filter((r: FinancialRecord) => r.user_id !== userId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherUsersRecords, ...newRecords]));
      setRecords(newRecords);
    } catch (error) {
      console.error('Failed to save records:', error);
    }
  };

  const addRecord = async (record: Omit<FinancialRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const newRecord: FinancialRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newRecords = [...records, newRecord];
    saveRecords(newRecords);
    return newRecord;
  };

  const updateRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    const updatedRecords = records.map((r) =>
      r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
    );
    saveRecords(updatedRecords);
  };

  const deleteRecord = async (id: string) => {
    const filteredRecords = records.filter((r) => r.id !== id);
    saveRecords(filteredRecords);
  };

  const duplicateRecord = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    
    const newRecord: FinancialRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      redemption_date: undefined, // 复制时清除赎回日期
    };
    
    const newRecords = [...records, newRecord];
    saveRecords(newRecords);
    return newRecord;
  };

  const getSummary = (): RecordSummary => {
    const rates = exchangeRates || { CNY: 1, USD: 7.24, EUR: 7.86, GBP: 9.15, JPY: 0.048, HKD: 0.93 };
    
    // 只统计未赎回的记录（用于本金、每日/每月收益统计）
    const activeRecords = records.filter((r) => !isRecordExpiredOrRedeemed(r));
    
    const totalPrincipal = activeRecords.reduce((sum, r) => sum + r.principal, 0);
    const totalPrincipalCNY = activeRecords.reduce((sum, r) => sum + convertToCNY(r.principal, r.currency, rates), 0);
    const totalPrincipalUSD = activeRecords.reduce((sum, r) => sum + convertToUSD(r.principal, r.currency, rates), 0);
    
    const totalDailyInterest = activeRecords.reduce((sum, r) => sum + calculateDailyInterest(r.principal, r.interest_rate), 0);
    const totalDailyInterestCNY = activeRecords.reduce((sum, r) => sum + convertToCNY(calculateDailyInterest(r.principal, r.interest_rate), r.currency, rates), 0);
    const totalDailyInterestUSD = activeRecords.reduce((sum, r) => sum + convertToUSD(calculateDailyInterest(r.principal, r.interest_rate), r.currency, rates), 0);
    
    const totalMonthlyInterest = activeRecords.reduce((sum, r) => sum + calculateMonthlyInterest(r.principal, r.interest_rate), 0);
    const totalMonthlyInterestCNY = activeRecords.reduce((sum, r) => sum + convertToCNY(calculateMonthlyInterest(r.principal, r.interest_rate), r.currency, rates), 0);
    const totalMonthlyInterestUSD = activeRecords.reduce((sum, r) => sum + convertToUSD(calculateMonthlyInterest(r.principal, r.interest_rate), r.currency, rates), 0);
    
    // 累计收益包含已赎回的记录（历史收益）
    const totalAnnualizedInterest = records.reduce((sum, r) => sum + calculateAnnualizedInterest(r.principal, r.interest_rate, r.start_date, r.redemption_date), 0);
    const totalAnnualizedInterestCNY = records.reduce((sum, r) => sum + convertToCNY(calculateAnnualizedInterest(r.principal, r.interest_rate, r.start_date, r.redemption_date), r.currency, rates), 0);
    const totalAnnualizedInterestUSD = records.reduce((sum, r) => sum + convertToUSD(calculateAnnualizedInterest(r.principal, r.interest_rate, r.start_date, r.redemption_date), r.currency, rates), 0);
    
    const totalAccumulatedInterest = records.reduce((sum, r) => sum + calculateAccumulatedInterest(r), 0);
    const totalAccumulatedInterestCNY = records.reduce((sum, r) => sum + convertToCNY(calculateAccumulatedInterest(r), r.currency, rates), 0);
    const totalAccumulatedInterestUSD = records.reduce((sum, r) => sum + convertToUSD(calculateAccumulatedInterest(r), r.currency, rates), 0);
    
    // 即将到期只统计未赎回的
    const upcomingExpirations = activeRecords.filter((r) => !r.is_long_term && r.end_date && isNearExpiration(r.end_date)).length;

    return {
      totalPrincipal,
      totalPrincipalCNY,
      totalPrincipalUSD,
      totalDailyInterest,
      totalDailyInterestCNY,
      totalDailyInterestUSD,
      totalMonthlyInterest,
      totalMonthlyInterestCNY,
      totalMonthlyInterestUSD,
      totalAnnualizedInterest,
      totalAnnualizedInterestCNY,
      totalAnnualizedInterestUSD,
      totalAccumulatedInterest,
      totalAccumulatedInterestCNY,
      totalAccumulatedInterestUSD,
      upcomingExpirations,
    };
  };

  // 获取未到期记录
  const getActiveRecords = (): FinancialRecord[] => {
    return records.filter((r) => !isRecordExpiredOrRedeemed(r));
  };

  // 获取已到期或已赎回记录
  const getExpiredRecords = (): FinancialRecord[] => {
    return records.filter((r) => isRecordExpiredOrRedeemed(r));
  };

  return {
    records,
    loading,
    exchangeRates,
    addRecord,
    updateRecord,
    deleteRecord,
    duplicateRecord,
    getSummary,
    getActiveRecords,
    getExpiredRecords,
  };
};
