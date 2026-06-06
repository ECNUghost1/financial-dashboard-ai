import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { getCountdown, isNearExpiration } from '../../utils/calculations';
import type { Countdown as CountdownType } from '../../types';

interface CountdownProps {
  endDate: string;
  showLabel?: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({ endDate, showLabel = true }) => {
  const [countdown, setCountdown] = useState<CountdownType>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const isNear = isNearExpiration(endDate);

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getCountdown(endDate));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!endDate) {
    return <span className="text-gray-400">长期持有</span>;
  }

  const TimeBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className={`flex flex-col items-center ${isNear ? 'text-red-600' : 'text-gray-600'}`}>
      <span className={`text-lg font-bold ${isNear ? 'text-red-600' : ''}`}>
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${isNear ? 'text-red-600' : ''}`}>
      {isNear && <AlertTriangle className="w-4 h-4 animate-pulse" />}
      <Clock className={`w-4 h-4 ${isNear ? 'text-red-600' : 'text-gray-400'}`} />
      {showLabel && <span className="text-sm text-gray-500">剩余:</span>}
      <div className="flex gap-1">
        <TimeBlock value={countdown.days} label="天" />
        <span className="text-gray-400">:</span>
        <TimeBlock value={countdown.hours} label="时" />
        <span className="text-gray-400">:</span>
        <TimeBlock value={countdown.minutes} label="分" />
        <span className="text-gray-400">:</span>
        <TimeBlock value={countdown.seconds} label="秒" />
      </div>
    </div>
  );
};
