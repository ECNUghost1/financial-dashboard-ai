import type { ExchangeRates, CurrencyType } from '../types';

// 汇率缓存，避免频繁请求
let cachedRates: ExchangeRates | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存

// 默认汇率（备用）
const DEFAULT_RATES: ExchangeRates = {
  CNY: 1,
  USD: 7.24,
  EUR: 7.86,
  GBP: 9.15,
  JPY: 0.048,
  HKD: 0.93,
};

// 获取汇率数据的API
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/CNY';

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const now = Date.now();
  
  // 如果缓存有效，直接返回缓存数据
  if (cachedRates && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    
    // 将API返回的汇率转换为以CNY为基准的汇率
    // API返回的是1 CNY = X 其他货币，我们需要的是1 其他货币 = X CNY
    const rates: ExchangeRates = {
      CNY: 1,
      USD: 1 / data.rates.USD,
      EUR: 1 / data.rates.EUR,
      GBP: 1 / data.rates.GBP,
      JPY: 1 / data.rates.JPY,
      HKD: 1 / data.rates.HKD,
    };
    
    cachedRates = rates;
    lastFetchTime = now;
    
    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates, using default rates:', error);
    return DEFAULT_RATES;
  }
};

// 将金额转换为人民币
export const convertToCNY = (amount: number, currency: CurrencyType, rates: ExchangeRates): number => {
  if (currency === 'CNY') return amount;
  return amount * rates[currency];
};

// 将金额转换为美元
export const convertToUSD = (amount: number, currency: CurrencyType, rates: ExchangeRates): number => {
  const cnyAmount = convertToCNY(amount, currency, rates);
  return cnyAmount / rates.USD;
};

// 获取货币符号
export const getCurrencySymbol = (currency: CurrencyType): string => {
  const symbols: Record<CurrencyType, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    HKD: 'HK$',
  };
  return symbols[currency];
};

// 获取货币名称
export const getCurrencyName = (currency: CurrencyType): string => {
  const names: Record<CurrencyType, string> = {
    CNY: '人民币',
    USD: '美元',
    EUR: '欧元',
    GBP: '英镑',
    JPY: '日元',
    HKD: '港币',
  };
  return names[currency];
};

// 格式化货币金额
export const formatCurrencyWithSymbol = (amount: number, currency: CurrencyType): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};