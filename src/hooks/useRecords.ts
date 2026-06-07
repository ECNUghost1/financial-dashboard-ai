import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { FinancialRecord, RecordSummary, ExchangeRates } from '../types';
import { calculateDailyInterest, calculateMonthlyInterest, calculateAnnualizedInterest, calculateAccumulatedInterest, isNearExpiration, isRecordExpiredOrRedeemed } from '../utils/calculations';
import { fetchExchangeRates, convertToCNY, convertToUSD } from '../utils/exchangeRate';

export const useRecords = (userId: string | null) => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  // 加载理财记录
  useEffect(() => {
    if (!userId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    loadRecords();
  }, [userId]);

  // 获取汇率数据
  useEffect(() => {
    const loadRates = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    loadRates();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('加载记录失败:', error);
        setRecords([]);
      } else {
        // 自动赎回超过截止日期的记录
        const now = new Date();
        const recordsToRedeem = data?.filter((r: FinancialRecord) => {
          if (r.redemption_date) return false;
          if (r.is_long_term) return false;
          if (!r.end_date) return false;
          return new Date(r.end_date) < now;
        }) || [];
        
        // 批量更新需要自动赎回的记录
        if (recordsToRedeem.length > 0) {
          for (const r of recordsToRedeem) {
            await supabase
              .from('financial_records')
              .update({ redemption_date: r.end_date })
              .eq('id', r.id);
          }
          // 重新加载记录
          const { data: updatedData } = await supabase
            .from('financial_records')
            .select('*')
            .eq('user_id', userId);
          // 自定义排序
          const sortedRecords = sortRecords(updatedData || []);
          setRecords(sortedRecords);
        } else {
          // 自定义排序
          const sortedRecords = sortRecords(data || []);
          setRecords(sortedRecords);
        }
      }
    } catch (err) {
      console.error('加载记录失败:', err);
      setRecords([]);
    }
    setLoading(false);
  };

  // 自定义排序函数
  const sortRecords = (records: FinancialRecord[]): FinancialRecord[] => {
    return [...records].sort((a, b) => {
      const aExpired = isRecordExpiredOrRedeemed(a);
      const bExpired = isRecordExpiredOrRedeemed(b);
      
      // 未到期的排在前面，已到期/已赎回的排在后面
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1;
      }
      
      // 未到期的记录：按截止日期升序（越近越靠前）
      if (!aExpired) {
        // 长期持有的记录排最后
        if (a.is_long_term && !b.is_long_term) return 1;
        if (!a.is_long_term && b.is_long_term) return -1;
        
        // 都不是长期持有，按截止日期升序
        if (a.end_date && b.end_date) {
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        }
        if (a.end_date) return -1;
        if (b.end_date) return 1;
      } else {
        // 已到期/已赎回的记录：按到期日或赎回日倒序
        const aSortDate = a.redemption_date || a.end_date;
        const bSortDate = b.redemption_date || b.end_date;
        
        if (aSortDate && bSortDate) {
          return new Date(bSortDate).getTime() - new Date(aSortDate).getTime();
        }
        if (aSortDate) return -1;
        if (bSortDate) return 1;
      }
      
      return 0;
    });
  };

  const addRecord = async (record: Omit<FinancialRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .insert({
          user_id: userId,
          ...record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('添加记录失败:', error);
        return null;
      }
      
      if (data) {
        setRecords((prev) => sortRecords([data, ...prev]));
        return data;
      }
      return null;
    } catch (err) {
      console.error('添加记录失败:', err);
      return null;
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    try {
      const { error } = await supabase
        .from('financial_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) {
        console.error('更新记录失败:', error);
        return;
      }
      
      setRecords((prev) =>
          sortRecords(prev.map((r) =>
            r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ))
        );
    } catch (err) {
      console.error('更新记录失败:', err);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('删除记录失败:', error);
        return;
      }
      
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('删除记录失败:', err);
    }
  };

  const duplicateRecord = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return null;
    
    const newRecord = {
      platform: record.platform,
      principal: record.principal,
      interest_rate: record.interest_rate,
      currency: record.currency,
      start_date: record.start_date,
      end_date: record.end_date,
      is_long_term: record.is_long_term,
      // 复制时清除赎回日期
    };
    
    return addRecord(newRecord);
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

  const getActiveRecords = () => {
    return records.filter((r) => !isRecordExpiredOrRedeemed(r));
  };

  const getExpiredRecords = () => {
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
    loadRecords,
  };
};