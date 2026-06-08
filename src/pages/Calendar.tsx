import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRecords } from '../hooks/useRecords';
import { calculateDailyInterest } from '../utils/calculations';
import { formatCurrencyWithSymbol, convertToUSD } from '../utils/exchangeRate';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import type { FinancialRecord, TransactionHistory } from '../types';
import { supabase } from '../utils/supabase';

interface DayData {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalInterestUSD: number;
  records: { record: FinancialRecord; dailyInterest: number; dailyInterestUSD: number; principal: number; rate: number }[];
}

interface MonthlyStats {
  month: string;
  totalInterestUSD: number;
  recordCount: number;
}

interface YearlyStats {
  year: number;
  totalInterestUSD: number;
  months: MonthlyStats[];
}

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { records } = useRecords(user?.id || null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'monthly' | 'yearly'>('calendar');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactionsByRecordId, setTransactionsByRecordId] = useState<Record<string, TransactionHistory[]>>({});

  const rates = { CNY: 1, USD: 7.24, EUR: 7.86, GBP: 9.15, JPY: 0.048, HKD: 0.93 };

  // 获取所有交易历史数据
  useEffect(() => {
    if (!user) return;
    
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('*');
      
      if (!error && data) {
        const grouped: Record<string, TransactionHistory[]> = {};
        data.forEach((t: TransactionHistory) => {
          if (!grouped[t.record_id]) {
            grouped[t.record_id] = [];
          }
          grouped[t.record_id].push(t);
        });
        // 按生效日期排序
        Object.keys(grouped).forEach(key => {
          grouped[key].sort((a, b) => 
            new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
          );
        });
        setTransactionsByRecordId(grouped);
      }
    };
    
    fetchTransactions();
  }, [user]);

  const generateCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const days: DayData[] = [];
    const startDay = firstDayOfMonth.getDay();
    
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(createDayData(date, false));
    }
    
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(createDayData(date, true));
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(createDayData(date, false));
    }
    
    return days;
  };

  // 获取某个日期的本金和利率（基于交易历史）
  const getPrincipalAndRateAtDate = (record: FinancialRecord, targetDate: Date, transactions: TransactionHistory[]) => {
    // 使用初始本金和利率
    let principal = record.initial_principal || record.principal;
    let rate = record.initial_interest_rate || record.interest_rate;
    
    // 按时间顺序应用交易历史变更
    for (const t of transactions) {
      const effectiveDate = new Date(t.effective_date);
      if (effectiveDate <= targetDate) {
        if (t.type === 'principal') {
          principal = t.new_value;
        } else if (t.type === 'rate') {
          rate = t.new_value;
        }
      } else {
        // 交易生效日期在目标日期之后，停止应用
        break;
      }
    }
    
    return { principal, rate };
  };

  // 处理UTC时间转换为本地时间
  const toLocalDate = (dateString: string): Date => {
    const date = new Date(dateString);
    // 数据库存储的是UTC时间，需要转换为本地时间
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date;
  };

  const createDayData = (date: Date, isCurrentMonth: boolean): DayData => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 今天结束时间
    const isToday = date.toDateString() === today.toDateString();
    
    // 只计算过去日期的收益（包括今天）
    const isPastOrToday = date <= today;
    
    const dayRecords: { record: FinancialRecord; dailyInterest: number; dailyInterestUSD: number; principal: number; rate: number }[] = [];
    let totalInterestUSD = 0;
    
    if (isPastOrToday) {
      records.forEach(record => {
        // 使用本地时间处理
        const startDate = toLocalDate(record.start_date);
        
        // 确定结束日期（使用本地时间）
        let endDate: Date;
        if (record.redemption_date) {
          endDate = toLocalDate(record.redemption_date);
        } else if (!record.is_long_term && record.end_date) {
          endDate = toLocalDate(record.end_date);
        } else {
          // 长期持有且未赎回，截止到今天
          endDate = today;
        }
        
        // 利息从开始日期当天就计算，但收益是T+1发放（第二天早上8点后到账）
        // 所以日历上显示的是"已到账"的收益，不是当天计算的利息
        
        // 设置时间为中午12点用于日期比较
        const checkDate = new Date(date);
        checkDate.setHours(12, 0, 0, 0);
        
        const startDateNoTime = new Date(startDate);
        startDateNoTime.setHours(0, 0, 0, 0);
        
        const endDateNoTime = new Date(endDate);
        endDateNoTime.setHours(23, 59, 59, 999);
        
        // T+1发放：当天的利息要到第二天早上8点后才能到账
        // 计算应该显示的利息日期（前一天的利息）
        const interestDate = new Date(checkDate);
        interestDate.setDate(interestDate.getDate() - 1);
        
        // 检查利息日期是否在计息范围内
        // 利息日期 >= 开始日期，且当天结算日期 <= 结束日期
        if (interestDate >= startDateNoTime && checkDate <= endDateNoTime) {
          // 获取利息日期的本金和利率
          const transactions = transactionsByRecordId[record.id] || [];
          const { principal, rate } = getPrincipalAndRateAtDate(record, interestDate, transactions);
          
          // 计算当天的利息
          const dailyInterest = calculateDailyInterest(principal, rate);
          const dailyInterestUSD = convertToUSD(dailyInterest, record.currency, rates);
          dayRecords.push({ record, dailyInterest, dailyInterestUSD, principal, rate });
          totalInterestUSD += dailyInterestUSD;
        }
      });
    }
    
    return {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      totalInterestUSD,
      records: dayRecords
    };
  };

  // 通过遍历当月每一天来计算月度收益（确保与日历每日收益一致）
  const calculateMonthlyStats = (year: number, month: number): MonthlyStats => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // 如果月份在未来，返回0
    const monthStart = new Date(year, month, 1);
    if (monthStart > today) {
      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        totalInterestUSD: 0,
        recordCount: 0
      };
    }
    
    // 生成当月所有日期的数据
    const monthDays: DayData[] = [];
    const lastDay = new Date(year, month + 1, 0);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      monthDays.push(createDayData(date, true));
    }
    
    // 累加当月每天的收益
    const totalInterestUSD = monthDays.reduce((sum, day) => sum + day.totalInterestUSD, 0);
    
    // 统计有收益的记录数（去重）
    const recordIds = new Set<string>();
    monthDays.forEach(day => {
      day.records.forEach(r => recordIds.add(r.record.id));
    });
    
    return {
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      totalInterestUSD,
      recordCount: recordIds.size
    };
  };

  const calculateYearlyStats = (year: number): YearlyStats => {
    const months: MonthlyStats[] = [];
    let totalInterestUSD = 0;
    
    for (let month = 0; month < 12; month++) {
      const monthlyStats = calculateMonthlyStats(year, month);
      months.push(monthlyStats);
      totalInterestUSD += monthlyStats.totalInterestUSD;
    }
    
    return {
      year,
      totalInterestUSD,
      months
    };
  };

  const getMonthlyStatsList = (): MonthlyStats[] => {
    const stats: MonthlyStats[] = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= currentYear - 2; year--) {
      for (let month = 11; month >= 0; month--) {
        const monthStart = new Date(year, month, 1);
        if (monthStart > new Date()) continue;
        stats.push(calculateMonthlyStats(year, month));
      }
    }
    
    return stats;
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const days = generateCalendarDays();
  const yearlyStats = calculateYearlyStats(selectedYear);
  const monthlyStatsList = getMonthlyStatsList();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">理财日历</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                日历视图
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                月度统计
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'yearly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                年度统计
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={prevMonth}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  {currentDate.getFullYear()}年{monthNames[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                今天
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100">
              {dayNames.map(day => (
                <div key={day} className="px-2 py-3 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative min-h-[100px] p-2 sm:p-3 cursor-pointer transition-colors ${
                    day.isCurrentMonth
                      ? day.isToday
                        ? 'bg-blue-50'
                        : 'bg-white hover:bg-gray-50'
                      : 'bg-gray-50'
                  } ${selectedDate?.toDateString() === day.date.toDateString() ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mx-auto ${
                    day.isToday ? 'bg-blue-500 text-white' : day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {day.day}
                  </div>
                  
                  {day.totalInterestUSD > 0 && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      +${day.totalInterestUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  
                  {day.records.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {day.records.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary-400"
                          title={`${item.record.platform}: +${formatCurrencyWithSymbol(item.dailyInterest, item.record.currency)}`}
                        />
                      ))}
                      {day.records.length > 3 && (
                        <span className="text-xs text-gray-400">+{day.records.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedDate && (
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    {(() => {
                      const d = new Date(selectedDate);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${year}/${month}/${day} 08:00`;
                    })()} 的收益明细
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    关闭
                  </button>
                </div>
                
                {selectedDate > new Date() ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>该日期尚未到达</p>
                  </div>
                ) : (
                  <>
                    {days.find(d => d.date.toDateString() === selectedDate?.toDateString())?.records.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>当日无理财收益</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {days
                          .find(d => d.date.toDateString() === selectedDate?.toDateString())
                          ?.records.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-800">{item.record.platform}</p>
                                <p className="text-xs text-gray-500">
                                  {item.record.currency} {item.principal.toLocaleString()} × {item.rate}%
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  +{formatCurrencyWithSymbol(item.dailyInterest, item.record.currency)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  ≈ +${item.dailyInterestUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))}
                        
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-semibold text-gray-800">合计收益</span>
                          <span className="text-lg font-bold text-green-600">
                            +${(days.find(d => d.date.toDateString() === selectedDate?.toDateString())?.totalInterestUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">月度收益统计</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlyStatsList.map((stat, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <p className="text-sm text-gray-500 mb-2">{stat.month}</p>
                    <p className="text-xl font-bold text-green-600">
                      +${stat.totalInterestUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {stat.recordCount} 个理财记录
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'yearly' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">年度收益统计</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-lg font-bold text-gray-800">{selectedYear}年</span>
                <button
                  onClick={() => selectedYear < new Date().getFullYear() && setSelectedYear(selectedYear + 1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedYear >= new Date().getFullYear()
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-500">全年累计收益</p>
                  <p className="text-2xl font-bold text-green-600">
                    +${yearlyStats.totalInterestUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {yearlyStats.months.map((month, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">{monthNames[index]}</p>
                    <p className="text-lg font-bold text-green-600">
                      +${month.totalInterestUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
