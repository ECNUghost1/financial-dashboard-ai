import React from 'react';
import { TrendingUp, DollarSign, Calendar, AlertCircle, Wallet } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  subtitle?: string;
  icon: 'trending' | 'dollar' | 'calendar' | 'alert' | 'wallet';
  color: 'primary' | 'cyan' | 'green' | 'red' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, secondaryValue, subtitle, icon, color }) => {
  const iconComponents = {
    trending: <TrendingUp className="w-6 h-6" />,
    dollar: <DollarSign className="w-6 h-6" />,
    calendar: <Calendar className="w-6 h-6" />,
    alert: <AlertCircle className="w-6 h-6" />,
    wallet: <Wallet className="w-6 h-6" />,
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

  return (
    <div className={`${colors.bg} rounded-xl p-4 sm:p-6 border ${colors.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-lg sm:text-xl md:text-2xl font-bold ${colors.text} mt-2 break-all`}>{value}</p>
          {secondaryValue && <p className="text-xs sm:text-sm text-gray-400 mt-1 break-all">{secondaryValue}</p>}
          {subtitle && !secondaryValue && <p className="text-xs sm:text-sm text-gray-400 mt-1">{subtitle}</p>}
          {subtitle && secondaryValue && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colors.icon} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
          {iconComponents[icon]}
        </div>
      </div>
    </div>
  );
};
