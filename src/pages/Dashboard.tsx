import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { StatCard } from '../components/Dashboard/StatCard';
import { RecordCard } from '../components/Dashboard/RecordCard';
import { useAuthStore } from '../store/authStore';
import { useRecords } from '../hooks/useRecords';
import { formatCurrencyWithSymbol } from '../utils/exchangeRate';
import { FileText, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { loading, deleteRecord, updateRecord, duplicateRecord, getSummary, getActiveRecords, getExpiredRecords, exchangeRates } = useRecords(user?.id || null);
  const summary = getSummary();
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

  const activeRecords = getActiveRecords();
  const expiredRecords = getExpiredRecords();
  const displayRecords = activeTab === 'active' ? activeRecords : expiredRecords;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="总本金"
          value={formatCurrencyWithSymbol(summary.totalPrincipalUSD, 'USD')}
          secondaryValue={formatCurrencyWithSymbol(summary.totalPrincipalCNY, 'CNY')}
          icon="dollar"
          color="primary"
        />
        <StatCard
          title="累计收益"
          value={formatCurrencyWithSymbol(summary.totalAccumulatedInterestUSD, 'USD')}
          secondaryValue={formatCurrencyWithSymbol(summary.totalAccumulatedInterestCNY, 'CNY')}
          icon="wallet"
          color="green"
          subtitle="已获得收益"
        />
        <StatCard
          title="每日收益"
          value={formatCurrencyWithSymbol(summary.totalDailyInterestUSD, 'USD')}
          secondaryValue={formatCurrencyWithSymbol(summary.totalDailyInterestCNY, 'CNY')}
          icon="trending"
          color="cyan"
          subtitle="预计今日收益"
        />
        <StatCard
          title="每月收益"
          value={formatCurrencyWithSymbol(summary.totalMonthlyInterestUSD, 'USD')}
          secondaryValue={formatCurrencyWithSymbol(summary.totalMonthlyInterestCNY, 'CNY')}
          icon="calendar"
          color="blue"
          subtitle="预计月度收益"
        />
        <StatCard
          title="即将到期"
          value={`${summary.upcomingExpirations} 笔`}
          icon="alert"
          color="red"
          subtitle={summary.upcomingExpirations > 0 ? '请留意到期时间' : '暂无即将到期'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">理财记录</h2>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'active'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                未到期 ({activeRecords.length})
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'expired'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                已到期/已赎回 ({expiredRecords.length})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="w-4 h-4" />
            <span>汇率更新: {exchangeRates ? '已获取' : '获取中...'}</span>
          </div>
        </div>

        {displayRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {activeTab === 'active' ? '暂无未到期理财记录' : '暂无已到期/已赎回记录'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'active' ? '点击右上角按钮添加您的第一条理财记录' : '已到期或已赎回的记录将显示在这里'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {displayRecords.map((record) => (
              <RecordCard 
              key={record.id} 
              record={record} 
              onDelete={deleteRecord}
              onRedeem={(id, redemptionDate) => updateRecord(id, { redemption_date: redemptionDate })}
              onDuplicate={duplicateRecord}
              exchangeRates={exchangeRates}
            />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
