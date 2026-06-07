/**
 * 将 datetime-local 格式的时间转换为 UTC ISO 字符串
 * datetime-local 输入的是本地时间，需要转换为 UTC 时间存储到数据库
 *
 * @param datetimeLocal - datetime-local 格式的时间字符串（如 "2024-01-01T10:00"）
 * @returns UTC ISO 字符串（如 "2024-01-01T02:00:00.000Z"，假设本地是 UTC+8）
 */
export const toLocalISOString = (datetimeLocal: string): string => {
  if (!datetimeLocal) return '';

  // datetime-local 格式: "2024-01-01T10:00"（本地时间）
  // 解析为 Date 对象（JavaScript 会把它当作本地时间）
  const date = new Date(datetimeLocal);

  // 转换为 UTC ISO 字符串
  return date.toISOString();
};

/**
 * 将 ISO 字符串转换为 datetime-local 格式（用于表单显示）
 *
 * @param isoString - ISO 格式的时间字符串（UTC 时间，如 "2024-01-01T02:00:00Z"）
 * @returns datetime-local 格式的时间字符串（本地时间，如 "2024-01-01T10:00"）
 */
export const toDatetimeLocal = (isoString: string | undefined): string => {
  if (!isoString) return '';

  // 解析 ISO 字符串（JavaScript 会自动处理时区转换）
  const date = new Date(isoString);

  // 获取本地时间的各个部分
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};