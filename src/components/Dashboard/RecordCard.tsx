import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FinancialRecord, ExchangeRates, TransactionHistory } from '../../types';
import { calculateDailyInterest, calculateMonthlyInterest, calculateAccumulatedInterestWithTransactions, formatDate, isNearExpiration, isRecordExpiredOrRedeemed } from '../../utils/calculations';
import { formatCurrencyWithSymbol, getCurrencyName, convertToCNY } from '../../utils/exchangeRate';
import { Countdown } from './Countdown';
import { Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, DollarSign, Copy, History, MoreHorizontal } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface RecordCardProps {
  record: FinancialRecord;
  onDelete: (id: string) => void;
  onRedeem: (id: string, redemptionDate: string) => void;
  onDuplicate: (id: string) => void;
  exchangeRates: ExchangeRates | null;
}

export const RecordCard: React.FC<RecordCardProps> = ({ record, onDelete, onRedeem, onDuplicate, exchangeRates }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true); // 默认展开
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const isNear = record.end_date ? isNearExpiration(record.end_date) : false;
  const isExpired = isRecordExpiredOrRedeemed(record);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transaction_history')
          .select('*')
          .eq('record_id', record.id)
          .order('effective_date', { ascending: true });
        
        if (!error && data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      }
    };
    
    fetchTransactions();
  }, [record.id]);

  const handleDuplicate = () => {
    onDuplicate(record.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rates = exchangeRates || { CNY: 1, USD: 7.24, EUR: 7.86, GBP: 9.15, JPY: 0.048, HKD: 0.93 };
  
  const dailyInterest = calculateDailyInterest(record.principal, record.interest_rate);
  const monthlyInterest = calculateMonthlyInterest(record.principal, record.interest_rate);
  // 使用带交易历史的累计收益计算
  const accumulatedInterest = calculateAccumulatedInterestWithTransactions(record, transactions);
  
  // 转换为人民币
  const dailyInterestCNY = convertToCNY(dailyInterest, record.currency, rates);
  const monthlyInterestCNY = convertToCNY(monthlyInterest, record.currency, rates);
  const accumulatedInterestCNY = convertToCNY(accumulatedInterest, record.currency, rates);
  const principalCNY = convertToCNY(record.principal, record.currency, rates);

  const handleDelete = () => {
    onDelete(record.id);
    setShowDeleteConfirm(false);
  };

  const handleRedeem = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const today = `${year}-${month}-${day}T${hours}:${minutes}`;
    onRedeem(record.id, today);
    setShowRedeemConfirm(false);
  };

  return (
    <div className={`bg-white rounded-xl border ${isExpired ? 'border-gray-300' : isNear ? 'border-red-200' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow overflow-hidden relative`}>
      {isExpired && (
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 font-medium">
            {record.redemption_date ? '已赎回' : '已到期'}
          </span>
        </div>
      )}
      {!isExpired && isNear && (
        <div className="bg-red-50 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600 font-medium">即将到期！</span>
        </div>
      )}
      
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">{record.platform}</h3>
              {record.is_long_term && (
                <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">长期</span>
              )}
              {record.currency !== 'CNY' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">{getCurrencyName(record.currency)}</span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">本金</p>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">{formatCurrencyWithSymbol(record.principal, record.currency)}</p>
                {record.currency !== 'CNY' && (
                  <p className="text-xs text-gray-400">≈ ¥{principalCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">年利率</p>
                <p className="font-semibold text-primary-600 text-sm sm:text-base">{record.interest_rate}%</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="hidden sm:inline">{expanded ? '收起' : '展开'}</span>
            </button>
            <button
              onClick={() => navigate(`/edit/${record.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">编辑</span>
            </button>
            <button
              onClick={() => navigate(`/history/${record.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">历史</span>
            </button>
            
            <div className="relative more-menu-container">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">更多</span>
              </button>
              
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-30 py-1 animate-fade-in">
                  <button
                    onClick={() => { handleDuplicate(); setShowMoreMenu(false); }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${copied ? 'text-green-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? '已复制' : '复制记录'}
                  </button>
                  {!isExpired && (
                    <button
                      onClick={() => { setShowRedeemConfirm(true); setShowMoreMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      赎回
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowMoreMenu(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-gray-100 animate-slide-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">每日利息</p>
                <p className="font-semibold text-blue-700 text-sm">{formatCurrencyWithSymbol(dailyInterest, record.currency)}</p>
                {record.currency !== 'CNY' && (
                  <p className="text-xs text-blue-400">≈ ¥{dailyInterestCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="text-xs text-cyan-600">每月利息</p>
                <p className="font-semibold text-cyan-700 text-sm">{formatCurrencyWithSymbol(monthlyInterest, record.currency)}</p>
                {record.currency !== 'CNY' && (
                  <p className="text-xs text-cyan-400">≈ ¥{monthlyInterestCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600">累计收益</p>
                <p className="font-semibold text-green-700 text-sm">{formatCurrencyWithSymbol(accumulatedInterest, record.currency)}</p>
                {record.currency !== 'CNY' && (
                  <p className="text-xs text-green-400">≈ ¥{accumulatedInterestCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">开始日期</span>
                <span className="text-gray-800 break-all max-w-[60%] text-right">{formatDate(record.start_date)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">截止日期</span>
                <span className="text-gray-800 break-all max-w-[60%] text-right">
                  {record.is_long_term ? '长期持有' : record.end_date ? formatDate(record.end_date) : '未设置'}
                </span>
              </div>
              {record.redemption_date && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">赎回日期</span>
                  <span className="text-gray-800 break-all max-w-[60%] text-right">{formatDate(record.redemption_date)}</span>
                </div>
              )}
            </div>

            {!record.is_long_term && record.end_date && !isExpired && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Countdown endDate={record.end_date} />
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">确认删除</h4>
                <p className="text-sm text-gray-500">此操作无法撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">确定要删除 {record.platform} 的记录吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showRedeemConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">确认赎回</h4>
                <p className="text-sm text-gray-500">赎回后将无法撤销</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">理财信息：</p>
              <p className="font-medium text-gray-800">{record.platform}</p>
              <p className="text-lg font-bold text-green-600 mt-2">{formatCurrencyWithSymbol(accumulatedInterest, record.currency)}</p>
              <p className="text-xs text-gray-500">累计收益</p>
            </div>
            <p className="text-gray-600 mb-6">确定要将此理财标记为已赎回吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRedeemConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRedeem}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                确认赎回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
