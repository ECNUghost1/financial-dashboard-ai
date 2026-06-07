import { supabase } from './supabase';

export interface LegacyUser {
  id: string;
  email: string;
  password: string;
  username?: string;
  created_at: string;
}

export interface LegacyFinancialRecord {
  id: string;
  platform: string;
  principal: number;
  interest_rate: number;
  currency: string;
  start_date: string;
  end_date?: string;
  is_long_term: boolean;
  redemption_date?: string;
  created_at: string;
  updated_at: string;
}

export const migrateFromLocalStorage = async (): Promise<{
  success: boolean;
  message: string;
  usersMigrated: number;
  recordsMigrated: number;
}> => {
  try {
    // 从 localStorage 获取旧数据
    const legacyUsers = JSON.parse(localStorage.getItem('users') || '[]') as LegacyUser[];
    const legacyRecords = JSON.parse(localStorage.getItem('financial_records') || '[]') as LegacyFinancialRecord[];
    
    if (legacyUsers.length === 0 && legacyRecords.length === 0) {
      return {
        success: true,
        message: '没有找到需要迁移的数据',
        usersMigrated: 0,
        recordsMigrated: 0,
      };
    }

    // 获取当前已登录用户（用于迁移该用户的记录）
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return {
        success: false,
        message: '请先登录后再进行数据迁移',
        usersMigrated: 0,
        recordsMigrated: 0,
      };
    }

    const currentUserId = session.user.id;
    let recordsMigrated = 0;

    // 迁移理财记录（只迁移当前用户的记录）
    for (const legacyRecord of legacyRecords) {
      // 检查记录是否已存在
      const { data: existingRecord } = await supabase
        .from('financial_records')
        .select('id')
        .eq('platform', legacyRecord.platform)
        .eq('principal', legacyRecord.principal)
        .eq('start_date', legacyRecord.start_date)
        .single();

      if (!existingRecord) {
        await supabase.from('financial_records').insert({
          user_id: currentUserId,
          platform: legacyRecord.platform,
          principal: legacyRecord.principal,
          interest_rate: legacyRecord.interest_rate,
          currency: legacyRecord.currency,
          start_date: legacyRecord.start_date,
          end_date: legacyRecord.end_date,
          is_long_term: legacyRecord.is_long_term,
          redemption_date: legacyRecord.redemption_date,
          created_at: legacyRecord.created_at,
          updated_at: legacyRecord.updated_at,
        });
        recordsMigrated++;
      }
    }

    // 清除 localStorage 中的旧数据（可选）
    // localStorage.removeItem('users');
    // localStorage.removeItem('financial_records');
    // localStorage.removeItem('currentUser');

    return {
      success: true,
      message: `数据迁移完成！共迁移 ${recordsMigrated} 条理财记录`,
      usersMigrated: 0,
      recordsMigrated,
    };
  } catch (error) {
    console.error('数据迁移失败:', error);
    return {
      success: false,
      message: `数据迁移失败: ${(error as Error).message}`,
      usersMigrated: 0,
      recordsMigrated: 0,
    };
  }
};

export const checkLegacyData = (): {
  hasLegacyData: boolean;
  userCount: number;
  recordCount: number;
} => {
  const legacyUsers = JSON.parse(localStorage.getItem('users') || '[]') as LegacyUser[];
  const legacyRecords = JSON.parse(localStorage.getItem('financial_records') || '[]') as LegacyFinancialRecord[];
  
  return {
    hasLegacyData: legacyUsers.length > 0 || legacyRecords.length > 0,
    userCount: legacyUsers.length,
    recordCount: legacyRecords.length,
  };
};