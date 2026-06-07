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
      const { error } = await supabase
        .from('transaction_history')
        .insert({
          record_id: recordId,
          type,
          old_value: oldValue,
          new_value: newValue,
          effective_date: effectiveDate ? toLocalISOString(effectiveDate) : new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create transaction:', error);
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
      const { error } = await supabase
        .from('transaction_history')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Failed to delete transaction:', error);
        return false;
      }

      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return false;
    }
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    deleteTransaction
  };
};
