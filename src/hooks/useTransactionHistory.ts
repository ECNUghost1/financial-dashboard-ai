import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { toLocalISOString } from '../utils/timezone';
import type { TransactionHistory, TransactionType } from '../types';

export const useTransactionHistory = (recordId: string | null) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!recordId) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('*')
        .eq('record_id', recordId)
        .order('effective_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch transactions:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  const createTransaction = useCallback(async (
    type: TransactionType,
    oldValue: number,
    newValue: number,
    effectiveDate?: string
  ): Promise<boolean> => {
    if (!recordId) return false;

    try {
      // 1. 创建变更记录
      const { error: insertError } = await supabase
        .from('transaction_history')
        .insert({
          record_id: recordId,
          type,
          old_value: oldValue,
          new_value: newValue,
          effective_date: effectiveDate ? toLocalISOString(effectiveDate) : new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create transaction:', insertError);
        return false;
      }

      // 2. 同步更新理财记录的当前值
      const updateField = type === 'principal' ? 'principal' : 'interest_rate';
      const { error: updateError } = await supabase
        .from('financial_records')
        .update({
          [updateField]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (updateError) {
        console.error('Failed to update record:', updateError);
        return false;
      }

      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      return false;
    }
  }, [recordId, fetchTransactions]);

  const deleteTransaction = useCallback(async (transactionId: string): Promise<boolean> => {
    try {
      // 先获取要删除的交易记录信息
      const { data: transaction, error: fetchError } = await supabase
        .from('transaction_history')
        .select('type, old_value')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch transaction:', fetchError);
        return false;
      }

      // 删除交易记录
      const { error: deleteError } = await supabase
        .from('transaction_history')
        .delete()
        .eq('id', transactionId);

      if (deleteError) {
        console.error('Failed to delete transaction:', deleteError);
        return false;
      }

      // 回滚理财记录的值到变更前的值
      const updateField = transaction.type === 'principal' ? 'principal' : 'interest_rate';
      const { error: updateError } = await supabase
        .from('financial_records')
        .update({
          [updateField]: transaction.old_value,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (updateError) {
        console.error('Failed to update record:', updateError);
        return false;
      }

      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return false;
    }
  }, [recordId, fetchTransactions]);

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    deleteTransaction
  };
};
