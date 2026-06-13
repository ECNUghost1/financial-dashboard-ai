import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { StatCard } from '../components/Dashboard/StatCard';
import { RecordCard } from '../components/Dashboard/RecordCard';
import { useAuthStore } from '../store/authStore';
import { useRecords } from '../hooks/useRecords';
import { formatCurrencyWithSymbol } from '../utils/exchangeRate';
import { migrateFromLocalStorage, checkLegacyData } from '../utils/migration';
import { FileText, RefreshCw, Database, AlertCircle, Filter } from 'lucide-react';
import type { PlatformTag, AssetType } from '../types';
import { PLATFORM_TAGS, ASSET_TYPES } from '../types';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { loading, deleteRecord, updateRecord, duplicateRecord, getSummary, getActiveRecords, getExpiredRecords, exchangeRates, loadRecords } = useRecords(user?.id || null);
  const summary = getSummary();
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');
  const [selectedPlatformTags, setSelectedPlatformTags] = useState<PlatformTag[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<AssetType[]>([]);
  
  // 数据迁移相关状态
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [legacyRecordCount, setLegacyRecordCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');

  // 检查是否有旧数据
  useEffect(() => {
    const legacyData = checkLegacyData();
    setHasLegacyData(legacyData.hasLegacyData);
    setLegacyRecordCount(legacyData.recordCount);
  }, []);

  // 执行数据迁移
  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationMessage('');
    
    const result = await migrateFromLocalStorage();
    
    if (result.success) {
      setMigrationMessage(result.message);
      setHasLegacyData(false);
      setLegacyRecordCount(0);
      // 重新加载记录
      await loadRecords();
    } else {
      setMigrationMessage(result.message);
    }
    
    setMigrating(false);
  };

  const activeRecords = getActiveRecords();
  const expiredRecords = getExpiredRecords();
  const rawRecords = activeTab === 'active' ? activeRecords : expiredRecords;
  
  // 平台筛选后的记录（用于等价物计数）
  const platformFilteredRecords = useMemo(() => {
    if (selectedPlatformTags.length === 0) return rawRecords;
    return rawRecords.filter(record => 
      record.platform_tag && selectedPlatformTags.includes(record.platform_tag)
    );
  }, [rawRecords, selectedPlatformTags]);
  
  // 等价物筛选后的记录（用于平台计数）
  const assetFilteredRecords = useMemo(() => {
    if (selectedAssetTypes.length === 0) return rawRecords;
    return rawRecords.filter(record => 
      record.asset_type && selectedAssetTypes.includes(record.asset_type)
    );
  }, [rawRecords, selectedAssetTypes]);
  
  // 最终显示的记录（两个筛选同时生效）
  const displayRecords = useMemo(() => {
    let filtered = rawRecords;
    
    // 平台标签筛选
    if (selectedPlatformTags.length > 0) {
      filtered = filtered.filter(record => 
        record.platform_tag && selectedPlatformTags.includes(record.platform_tag)
      );
    }
    
    // 等价物筛选
    if (selectedAssetTypes.length > 0) {
      filtered = filtered.filter(record => 
        record.asset_type && selectedAssetTypes.includes(record.asset_type)
      );
    }
    
    return filtered;
  }, [rawRecords, selectedPlatformTags, selectedAssetTypes]);

  // 切换标签选择
  const togglePlatformTag = (tag: PlatformTag) => {
    setSelectedPlatformTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 清除所有标签选择
  const clearPlatformTags = () => {
    setSelectedPlatformTags([]);
  };

  // 切换等价物选择
  const toggleAssetType = (asset: AssetType) => {
    setSelectedAssetTypes(prev => 
      prev.includes(asset) 
        ? prev.filter(a => a !== asset)
        : [...prev, asset]
    );
  };

  // 清除所有等价物选择
  const clearAssetTypes = () => {
    setSelectedAssetTypes([]);
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

      {/* 数据迁移提示 */}
      {hasLegacyData && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-amber-800">发现本地数据</h4>
              <p className="text-sm text-amber-600">检测到您之前存储的 {legacyRecordCount} 条理财记录，需要迁移到云端吗？</p>
            </div>
          </div>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {migrating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                迁移中...
              </>
            ) : (
              <>立即迁移</>
            )}
          </button>
        </div>
      )}

      {migrationMessage && (
        <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
          migrationMessage.includes('失败') 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <AlertCircle className={`w-5 h-5 ${
            migrationMessage.includes('失败') ? 'text-red-500' : 'text-green-500'
          }`} />
          <span className={migrationMessage.includes('失败') ? 'text-red-700' : 'text-green-700'}>
            {migrationMessage}
          </span>
        </div>
      )}

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

        {/* 平台标签筛选 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-start gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0 pt-1.5">
            <Filter className="w-4 h-4" />
            <span className="whitespace-nowrap">平台筛选：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_TAGS.map((tag) => {
              const count = assetFilteredRecords.filter(r => r.platform_tag === tag).length;
              return (
                <label
                  key={tag}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${
                    selectedPlatformTags.includes(tag)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatformTags.includes(tag)}
                    onChange={() => togglePlatformTag(tag)}
                    className="sr-only"
                  />
                  <span>{tag}</span>
                  {count > 0 && (
                    <span className={`text-xs ${selectedPlatformTags.includes(tag) ? 'text-purple-100' : 'text-gray-400'}`}>
                      ({count})
                    </span>
                  )}
                </label>
              );
            })}
            {selectedPlatformTags.length > 0 && (
              <button
                onClick={clearPlatformTags}
                className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* 等价物筛选 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-start gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0 pt-1.5">
            <Filter className="w-4 h-4" />
            <span className="whitespace-nowrap">等价物筛选：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((asset) => {
              const count = platformFilteredRecords.filter(r => r.asset_type === asset).length;
              return (
                <label
                  key={asset}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${
                    selectedAssetTypes.includes(asset)
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssetTypes.includes(asset)}
                    onChange={() => toggleAssetType(asset)}
                    className="sr-only"
                  />
                  <span>{asset}</span>
                  {count > 0 && (
                    <span className={`text-xs ${selectedAssetTypes.includes(asset) ? 'text-amber-100' : 'text-gray-400'}`}>
                      ({count})
                    </span>
                  )}
                </label>
              );
            })}
            {selectedAssetTypes.length > 0 && (
              <button
                onClick={clearAssetTypes}
                className="px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
              >
                清除筛选
              </button>
            )}
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
