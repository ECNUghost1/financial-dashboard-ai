import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useRecords } from '../hooks/useRecords';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { generateInterestPeriods, calculateTotalInterestWithHistory } from '../utils/transactionHistory';
import { formatCurrencyWithSymbol, getCurrencyName } from '../utils/exchangeRate';
import { formatDate } from '../utils/calculations';
import { ArrowLeft, History, Plus, Trash2, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import type { TransactionType, FinancialRecord } from '../types';

export const RecordHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecordById } = useRecords(null);
  const { transactions, loading, fetchTransactions, createTransaction, deleteTransaction } = useTransactionHistory(id || null);
  
  const [record, setRecord] = useState<FinancialRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('principal');
  const [newValue, setNewValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        const found = await getRecordById(id);
        setRecord(found);
      };
      fetchRecord();
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!record) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const periods = generateInterestPeriods(record, transactions);
  const totalInterest = calculateTotalInterestWithHistory(record, transactions);

  const handleAddTransaction = async () => {
    if (!newValue) return;
    
    const oldValue = transactionType === 'principal' ? record.principal : record.interest_rate;
    const success = await createTransaction(
      transactionType,
      oldValue,
      parseFloat(newValue),
      effectiveDate || undefined
    );
    
    if (success) {
      // 重新获取理财记录以显示更新后的值
      const updatedRecord = await getRecordById(id || '');
      if (updatedRecord) {
        setRecord(updatedRecord);
      }
      setShowAddModal(false);
      setNewValue('');
      setEffectiveDate('');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const success = await deleteTransaction(transactionId);
    if (success) {
      // 重新获取理财记录以显示更新后的值
      const updatedRecord = await getRecordById(id || '');
      if (updatedRecord) {
        setRecord(updatedRecord);
      }
    }
  };

  const getTransactionTypeName = (type: TransactionType) => {
    return type === 'principal' ? '本金变更' : '利率变更';
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    return type === 'principal' ? <DollarSign className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />;
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    return type === 'principal' 
      ? 'bg-blue-100 text-blue-600' 
      : 'bg-green-100 text-green-600';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{record.platform} - 收益历史</h1>
            <p className="text-sm text-gray-500">追踪本金、利率变化与收益计算</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">当前本金</p>
            <p className="text-lg font-bold text-gray-800">
              {formatCurrencyWithSymbol(record.principal, record.currency)}
            </p>
            {record.currency !== 'CNY' && (
              <p className="text-xs text-gray-400">({getCurrencyName(record.currency)})</p>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">当前利率</p>
            <p className="text-lg font-bold text-primary-600">{record.interest_rate}%</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-600 mb-1">累计收益（按历史计算）</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrencyWithSymbol(totalInterest, record.currency)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-800">交易历史记录</h2>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加变更记录
            </button>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无交易记录</p>
              <p className="text-sm text-gray-400 mt-1">点击上方按钮添加本金或利率变更</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${getTransactionTypeColor(transaction.type)} rounded-lg flex items-center justify-center`}>
                      {getTransactionTypeIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{getTransactionTypeName(transaction.type)}</div>
                      <div className="text-sm text-gray-500">生效日期: {formatDate(transaction.effective_date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {transaction.type === 'principal' ? '金额' : '利率'}: 
                      <span className="text-gray-800"> {transaction.old_value}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-semibold text-primary-600">{transaction.new_value}</span>
                      {transaction.type === 'principal' && (
                        <span className="text-gray-400 ml-1">{getCurrencyName(record.currency)}</span>
                      )}
                      {transaction.type === 'rate' && <span className="text-gray-400 ml-1">%</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTransaction(transaction.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-800">收益分段计算</h2>
          </div>
          
          {periods.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无收益记录</p>
              <p className="text-sm text-gray-400 mt-1">收益将从开始日期开始计算</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {periods.map((period, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      阶段 {index + 1}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(period.start_date.toISOString())} ~ {formatDate(period.end_date.toISOString())}
                    </span>
                    <span className="text-sm text-gray-400">({period.days} 天)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">本金</p>
                      <p className="font-semibold text-gray-800">
                        {formatCurrencyWithSymbol(period.principal, record.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">利率</p>
                      <p className="font-semibold text-primary-600">{period.rate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">阶段收益</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrencyWithSymbol(period.interest, record.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-gray-700">总计收益</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrencyWithSymbol(totalInterest, record.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">添加变更记录</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">变更类型</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransactionType('principal')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    transactionType === 'principal' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  本金变更
                </button>
                <button
                  onClick={() => setTransactionType('rate')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    transactionType === 'rate' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  利率变更
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新{transactionType === 'principal' ? '本金' : '利率'}
                <span className="text-gray-400 ml-2">
                  当前值: {transactionType === 'principal' ? formatCurrencyWithSymbol(record.principal, record.currency) : `${record.interest_rate}%`}
                </span>
              </label>
              <input
                type={transactionType === 'principal' ? 'number' : 'number'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`请输入新${transactionType === 'principal' ? '本金' : '利率'}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                step={transactionType === 'principal' ? '0.01' : '0.01'}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">生效日期（可选）</label>
              <input
                type="datetime-local"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">不填则默认为当前时间</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={!newValue}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
