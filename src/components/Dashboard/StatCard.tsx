import React from 'react';
import { TrendingUp, DollarSign, Calendar, AlertCircle, Wallet } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  subtitle?: string;
  icon: 'trending' | 'dollar' | 'calendar' | 'alert' | 'wallet';
  color: 'primary' | 'cyan' | 'green' | 'red' | 'blue';
  decimalPlaces?: number;
}

// 格式化大数字，使用 K/M/B 后缀
const formatLargeNumber = (valueStr: string, decimalPlaces: number = 2): { display: string; original: string } => {
  // 提取货币符号和数字
  const match = valueStr.match(/^([¥$€£]?)([\d,]+\.?\d*)(.*)$/);
  if (!match) return { display: valueStr, original: valueStr };
  
  const [, symbol, numStr, suffix] = match;
  const num = parseFloat(numStr.replace(/,/g, ''));
  
  if (isNaN(num)) return { display: valueStr, original: valueStr };
  
  let displayNum: string;
  let unit: string = '';
  
  if (num >= 1_000_000_000) {
    displayNum = (num / 1_000_000_000).toFixed(decimalPlaces);
    unit = 'B';
  } else if (num >= 1_000_000) {
    displayNum = (num / 1_000_000).toFixed(decimalPlaces);
    unit = 'M';
  } else if (num >= 10_000) {
    displayNum = (num / 1_000).toFixed(decimalPlaces);
    unit = 'K';
  } else {
    displayNum = num.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: decimalPlaces });
  }
  
  return {
    display: `${symbol}${displayNum}${unit}${suffix}`,
    original: valueStr
  };
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, secondaryValue, subtitle, icon, color, decimalPlaces = 2 }) => {
  const iconComponents = {
    trending: <TrendingUp className="w-3.5 h-3.5" />,
    dollar: <DollarSign className="w-3.5 h-3.5" />,
    calendar: <Calendar className="w-3.5 h-3.5" />,
    alert: <AlertCircle className="w-3.5 h-3.5" />,
    wallet: <Wallet className="w-3.5 h-3.5" />,
  };

  const colorClasses = {
    primary: {
      bg: 'bg-primary-50',
      icon: 'bg-primary-500 text-white',
      text: 'text-primary-600',
      border: 'border-primary-100',
    },
    cyan: {
      bg: 'bg-cyan-50',
      icon: 'bg-cyan-500 text-white',
      text: 'text-cyan-600',
      border: 'border-cyan-100',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-500 text-white',
      text: 'text-green-600',
      border: 'border-green-100',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-500 text-white',
      text: 'text-red-600',
      border: 'border-red-100',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-500 text-white',
      text: 'text-blue-600',
      border: 'border-blue-100',
    },
  };

  const colors = colorClasses[color];
  const formattedValue = formatLargeNumber(value, decimalPlaces);
  const formattedSecondary = secondaryValue ? formatLargeNumber(secondaryValue, decimalPlaces) : null;

  return (
    <div className={`${colors.bg} rounded-xl p-4 sm:p-6 border ${colors.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p 
            className={`text-lg sm:text-xl md:text-2xl font-bold ${colors.text} mt-2 truncate`}
            title={formattedValue.original}
          >
            {formattedValue.display}
          </p>
          {formattedSecondary && (
            <p 
              className="text-xs sm:text-sm text-gray-400 mt-1 truncate"
              title={formattedSecondary.original}
            >
              {formattedSecondary.display}
            </p>
          )}
          {subtitle && !secondaryValue && <p className="text-xs sm:text-sm text-gray-400 mt-1">{subtitle}</p>}
          {subtitle && secondaryValue && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 ${colors.icon} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
          {iconComponents[icon]}
        </div>
      </div>
    </div>
  );
};
