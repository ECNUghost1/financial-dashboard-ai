import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useRecords } from '../../hooks/useRecords';
import { Save, ArrowLeft, Calculator } from 'lucide-react';
import { calculateDailyInterest, calculateMonthlyInterest } from '../../utils/calculations';
import { formatCurrencyWithSymbol } from '../../utils/exchangeRate';
import { toLocalISOString, toDatetimeLocal } from '../../utils/timezone';
import type { CurrencyType } from '../../types';

const CURRENCIES: { value: CurrencyType; label: string }[] = [
  { value: 'CNY', label: '人民币 (CNY)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'EUR', label: '欧元 (EUR)' },
  { value: 'GBP', label: '英镑 (GBP)' },
  { value: 'JPY', label: '日元 (JPY)' },
  { value: 'HKD', label: '港币 (HKD)' },
];

interface RecordFormProps {
  type: 'add' | 'edit';
}

export const RecordForm: React.FC<RecordFormProps> = ({ type }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { records, addRecord, updateRecord, loading } = useRecords(user?.id || null);

  // 获取今天08:00的默认日期时间
  const getDefaultDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T08:00`;
  };

  const [formData, setFormData] = useState({
    platform: '',
    principal: '',
    interest_rate: '',
    currency: 'CNY' as CurrencyType,
    start_date: getDefaultDateTime(),
    end_date: '',
    is_long_term: false,
    redemption_date: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'edit' && id && !loading) {
      const record = records.find((r) => r.id === id);
      if (record) {
        setFormData({
          platform: record.platform,
          principal: record.principal.toString(),
          interest_rate: record.interest_rate.toString(),
          currency: record.currency,
          start_date: toDatetimeLocal(record.start_date),
          end_date: toDatetimeLocal(record.end_date) || '',
          is_long_term: record.is_long_term,
          redemption_date: toDatetimeLocal(record.redemption_date) || '',
        });
      }
    }
  }, [type, id, records, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.platform || !formData.principal || !formData.interest_rate || !formData.start_date) {
      setError('请填写必填字段');
      return;
    }

    const principal = parseFloat(formData.principal);
    const interestRate = parseFloat(formData.interest_rate);

    if (isNaN(principal) || principal <= 0) {
      setError('请输入有效的本金金额');
      return;
    }

    if (isNaN(interestRate) || interestRate < 0) {
      setError('请输入有效的年利率');
      return;
    }

    if (!formData.is_long_term && !formData.end_date) {
      setError('请选择截止日期或勾选长期持有');
      return;
    }

    const recordData = {
      user_id: user!.id,
      platform: formData.platform,
      principal,
      interest_rate: interestRate,
      currency: formData.currency,
      start_date: toLocalISOString(formData.start_date),
      end_date: formData.is_long_term ? undefined : toLocalISOString(formData.end_date) || undefined,
      is_long_term: formData.is_long_term,
      redemption_date: formData.redemption_date ? toLocalISOString(formData.redemption_date) : undefined,
    };

    if (type === 'add') {
      await addRecord(recordData);
    } else if (type === 'edit' && id) {
      await updateRecord(id, recordData);
    }

    navigate('/dashboard');
  };

  const dailyInterest = formData.principal && formData.interest_rate
    ? calculateDailyInterest(parseFloat(formData.principal), parseFloat(formData.interest_rate))
    : 0;

  const monthlyInterest = formData.principal && formData.interest_rate
    ? calculateMonthlyInterest(parseFloat(formData.principal), parseFloat(formData.interest_rate))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {type === 'add' ? '添加理财记录' : '编辑理财记录'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">平台名称 *</label>
            <input
              type="text"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="例如：支付宝、微信理财"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">货币类型 *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyType })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">本金 *</label>
            <input
              type="number"
              step="0.01"
              value={formData.principal}
              onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="请输入本金金额"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年利率 (%) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.interest_rate}
              onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="请输入年利率"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">开始日期 *</label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_long_term"
              checked={formData.is_long_term}
              onChange={(e) => setFormData({ ...formData, is_long_term: e.target.checked, end_date: '' })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_long_term" className="ml-2 text-sm font-medium text-gray-700">
              长期持有
            </label>
          </div>

          {!formData.is_long_term && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">截止日期 *</label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => {
                  let value = e.target.value;
                  // 如果只选择了日期，默认时间为08:00
                  if (value && value.length === 10) {
                    value += 'T08:00';
                  }
                  setFormData({ ...formData, end_date: value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">赎回日期 (可选)</label>
            <input
              type="datetime-local"
              value={formData.redemption_date}
              onChange={(e) => {
                let value = e.target.value;
                // 如果只选择了日期，默认时间为08:00
                if (value && value.length === 10) {
                  value += 'T08:00';
                }
                setFormData({ ...formData, redemption_date: value });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="设置赎回日期后，将按实际持有天数计算收益"
            />
          </div>
        </div>

        {(dailyInterest > 0 || monthlyInterest > 0) && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-700">利息计算预览</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-600">每日利息</p>
                <p className="text-lg font-semibold text-blue-800">{formatCurrencyWithSymbol(dailyInterest, formData.currency)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">每月利息</p>
                <p className="text-lg font-semibold text-blue-800">{formatCurrencyWithSymbol(monthlyInterest, formData.currency)}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {type === 'add' ? '保存记录' : '更新记录'}
          </button>
        </div>
      </form>
    </div>
  );
};
