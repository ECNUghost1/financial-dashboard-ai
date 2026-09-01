import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { useRecords } from '../hooks/useRecords';
import { convertToCNY, convertToUSD, formatCurrencyWithSymbol, getExchangeRateUpdateTime } from '../utils/exchangeRate';
import { isRecordExpiredOrRedeemed } from '../utils/calculations';
import { PLATFORM_TAGS, ASSET_TYPES } from '../types';
import type { FinancialRecord } from '../types';
import { BarChart3, Building2, Coins, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PLATFORM_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const ASSET_COLOR_MAP: Record<string, string> = {
  BTC: '#f7931a',   // 橙色
  USDT: '#10b981',  // 绿色
  USD1: '#eab308',  // 黄色
  USDC: '#3b82f6',  // 蓝色
  U: '#1a1a1a',     // 黑色
  XAUT: '#c9a227',  // 深金色
};

interface PieDatum {
  name: string;
  value: number;
  count: number;
  color?: string;
}

interface StatsPieChartProps {
  data: PieDatum[];
  colors: string[];
  totalUSD: number;
  rates: { USD: number };
  formatLarge: (n: number) => string;
}

const renderLabel = (entry: any) => {
  return `${entry.name} ${(entry.percent * 100).toFixed(1)}%`;
};

const StatsPieChart: React.FC<StatsPieChartProps> = React.memo(({ data, colors, totalUSD, rates, formatLarge }) => {
  const renderTooltip = useCallback((props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const item = props.payload[0].payload;
      const pct = totalUSD > 0 ? (item.value / totalUSD * 100).toFixed(1) : '0';
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-medium text-gray-800">{item.name}</p>
          <p className="text-gray-600">${formatLarge(item.value)} <span className="text-gray-400">(¥{formatLarge(item.value * rates.USD)})</span></p>
          <p className="text-gray-400 text-xs">{item.count} 条记录 · {pct}%</p>
        </div>
      );
    }
    return null;
  }, [totalUSD, rates, formatLarge]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((d, index) => (
            <Cell key={`cell-${index}`} fill={d.color || colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
        <Legend
          formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

export const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { records, loading, exchangeRates } = useRecords(user?.id || null);

  const rates = exchangeRates || { CNY: 1, USD: 7.24, EUR: 7.86, GBP: 9.15, JPY: 0.048, HKD: 0.93 };

  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

  const togglePlatform = (tag: string) => {
    setExpandedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const toggleAsset = (type: string) => {
    setExpandedAssets(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // 只统计未到期/未赎回的记录
  const activeRecords = useMemo(() => records.filter((r) => !isRecordExpiredOrRedeemed(r)), [records]);

  // 按平台统计
  const platformStats = useMemo(() => {
    const stats: Record<string, { count: number; principalCNY: number; principalUSD: number; records: FinancialRecord[] }> = {};

    PLATFORM_TAGS.forEach((tag) => {
      stats[tag] = { count: 0, principalCNY: 0, principalUSD: 0, records: [] };
    });

    activeRecords.forEach((r) => {
      const tag = r.platform_tag;
      if (tag && stats[tag]) {
        stats[tag].count++;
        stats[tag].principalCNY += convertToCNY(r.principal, r.currency, rates);
        stats[tag].principalUSD += convertToUSD(r.principal, r.currency, rates);
        stats[tag].records.push(r);
      }
    });

    return PLATFORM_TAGS.map((tag) => ({
      tag,
      ...stats[tag],
    })).filter(s => s.count > 0).sort((a, b) => b.principalUSD - a.principalUSD);
  }, [activeRecords, rates]);

  // 按等价物统计
  const assetStats = useMemo(() => {
    const stats: Record<string, { count: number; principalCNY: number; principalUSD: number; records: FinancialRecord[] }> = {};

    ASSET_TYPES.forEach((type) => {
      stats[type] = { count: 0, principalCNY: 0, principalUSD: 0, records: [] };
    });

    activeRecords.forEach((r) => {
      const type = r.asset_type;
      if (type && stats[type]) {
        stats[type].count++;
        stats[type].principalCNY += convertToCNY(r.principal, r.currency, rates);
        stats[type].principalUSD += convertToUSD(r.principal, r.currency, rates);
        stats[type].records.push(r);
      }
    });

    return ASSET_TYPES.map((type) => ({
      type,
      ...stats[type],
    })).filter(s => s.count > 0).sort((a, b) => b.principalUSD - a.principalUSD);
  }, [activeRecords, rates]);

  // 总计
  const totalPrincipalCNY = platformStats.reduce((sum, s) => sum + s.principalCNY, 0);
  const totalPrincipalUSD = platformStats.reduce((sum, s) => sum + s.principalUSD, 0);

  // 格式化大数字
  const formatLarge = useCallback((num: number): string => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 10_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  // 饼图数据
  const platformPieData = useMemo(() => platformStats.map(s => ({ name: s.tag, value: s.principalUSD, count: s.count })), [platformStats]);
  const assetPieData = useMemo(() => assetStats.map(s => ({ name: s.type, value: s.principalUSD, count: s.count, color: ASSET_COLOR_MAP[s.type] })), [assetStats]);

  // 格式化日期
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '长期';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const noData = platformStats.length === 0 && assetStats.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">统计概览</h1>
              <p className="text-sm text-gray-500 mt-1">
                总本金：${formatLarge(totalPrincipalUSD)} <span className="text-gray-400">/ ¥{formatLarge(totalPrincipalCNY)}</span>
                <span className="text-gray-400 ml-2">| 1 USD = ¥{rates.USD.toFixed(4)}（{getExchangeRateUpdateTime()}）</span>
              </p>
            </div>
          </div>
        </div>

        {noData ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            暂无未到期记录
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 平台统计饼图 */}
            {platformPieData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  <h2 className="text-lg font-bold text-gray-800">平台统计</h2>
                </div>
                <div className="p-4">
                  <StatsPieChart data={platformPieData} colors={PLATFORM_COLORS} totalUSD={totalPrincipalUSD} rates={rates} formatLarge={formatLarge} />
                </div>
                {/* 详细列表 */}
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {platformStats.map((s, i) => (
                    <div key={s.tag}>
                      <div
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => togglePlatform(s.tag)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[i % PLATFORM_COLORS.length] }} />
                          {expandedPlatforms.has(s.tag) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <span className="font-medium text-gray-700">{s.tag}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s.count} 条</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">${formatLarge(s.principalUSD)}</span>
                          <span className="text-xs text-gray-400 ml-2">¥{formatLarge(s.principalCNY)}</span>
                        </div>
                      </div>
                      {/* 展开的项目列表 */}
                      {expandedPlatforms.has(s.tag) && (
                        <div className="bg-gray-50 px-6 py-2 space-y-1">
                          {s.records.map((r) => (
                            <div key={r.id} className="flex items-center justify-between py-1.5 text-sm pl-7">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-gray-600 truncate">{r.platform}</span>
                                <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{r.asset_type}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs whitespace-nowrap">
                                <span className="text-gray-700 font-medium">{formatCurrencyWithSymbol(r.principal, r.currency)}</span>
                                <span className="text-gray-500">{r.interest_rate}%</span>
                                <span className="text-gray-400">{formatDate(r.end_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 等价物统计饼图 */}
            {assetPieData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-800">等价物统计</h2>
                </div>
                <div className="p-4">
                  <StatsPieChart data={assetPieData} colors={PLATFORM_COLORS} totalUSD={totalPrincipalUSD} rates={rates} formatLarge={formatLarge} />
                </div>
                {/* 详细列表 */}
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {assetStats.map((s, i) => (
                    <div key={s.type}>
                      <div
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleAsset(s.type)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLOR_MAP[s.type] || PLATFORM_COLORS[i % PLATFORM_COLORS.length] }} />
                          {expandedAssets.has(s.type) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <span className="font-medium text-gray-700">{s.type}</span>
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{s.count} 条</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">${formatLarge(s.principalUSD)}</span>
                          <span className="text-xs text-gray-400 ml-2">¥{formatLarge(s.principalCNY)}</span>
                        </div>
                      </div>
                      {/* 展开的项目列表 */}
                      {expandedAssets.has(s.type) && (
                        <div className="bg-gray-50 px-6 py-2 space-y-1">
                          {s.records.map((r) => (
                            <div key={r.id} className="flex items-center justify-between py-1.5 text-sm pl-7">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-gray-600 truncate">{r.platform}</span>
                                {r.platform_tag && <span className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{r.platform_tag}</span>}
                              </div>
                              <div className="flex items-center gap-4 text-xs whitespace-nowrap">
                                <span className="text-gray-700 font-medium">{formatCurrencyWithSymbol(r.principal, r.currency)}</span>
                                <span className="text-gray-500">{r.interest_rate}%</span>
                                <span className="text-gray-400">{formatDate(r.end_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
