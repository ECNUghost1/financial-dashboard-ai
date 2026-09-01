import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import type { User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function createUserFromAuthUser(authUser: { id: string; email?: string; created_at?: string }, usernameFromMeta?: string): User {
  const email = authUser.email || '';
  return {
    id: authUser.id,
    email,
    username: usernameFromMeta || email.split('@')[0] || '',
    created_at: authUser.created_at || new Date().toISOString(),
  };
}

async function fetchUserProfileWithTimeout(authUser: { id: string; email?: string; created_at?: string }, timeoutMs = 3000): Promise<User> {
  const fallbackUser = createUserFromAuthUser(authUser);

  return new Promise<User>((resolve) => {
    const timeout = setTimeout(() => resolve(fallbackUser), timeoutMs);

    // 使用 Promise.resolve 包装以支持 catch
    Promise.resolve(
      supabase
        .from('profiles')
        .select('username, created_at')
        .eq('id', authUser.id)
        .single()
    )
      .then(({ data: profile, error }) => {
        clearTimeout(timeout);
        if (error || !profile) {
          resolve(fallbackUser);
        } else {
          resolve({
            id: authUser.id,
            email: authUser.email || '',
            username: profile.username || fallbackUser.username,
            created_at: profile.created_at || fallbackUser.created_at,
          });
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(fallbackUser);
      });
  });
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: '登录失败' };

      // 登录成功，先立即设置用户状态（用 auth 返回的信息，保证页面能跳转）
      const basicUser = createUserFromAuthUser(data.user);
      set({ user: basicUser, isLoading: false });

      // 异步尝试获取 profile 补充信息，失败也不影响
      fetchUserProfileWithTimeout(data.user).then((user) => {
        useAuthStore.setState({ user });
      });

      return { success: true };
    } catch {
      return { success: false, error: '网络错误，请稍后重试' };
    }
  },

  register: async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: '注册失败' };

      // 尝试写入 profiles 表，失败不影响注册结果
      try {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          created_at: new Date().toISOString(),
        });
      } catch {
        // 忽略，profiles 表可能不存在或有触发器
      }

      const user = createUserFromAuthUser(data.user, username);
      set({ user, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: '网络错误，请稍后重试' };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // 忽略退出登录错误
    }
    set({ user: null, isLoading: false });
  },

  checkAuth: () => {
    // 超时保护：5 秒后强制结束 loading
    const forceEndTimeout = setTimeout(() => {
      set({ user: null, isLoading: false });
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(forceEndTimeout);
        if (session?.user) {
          const basicUser = createUserFromAuthUser(session.user);
          set({ user: basicUser, isLoading: false });

          // 异步补充 profile 信息
          fetchUserProfileWithTimeout(session.user).then((user) => {
            useAuthStore.setState({ user });
          });
        } else {
          set({ user: null, isLoading: false });
        }
      })
      .catch(() => {
        set({ user: null, isLoading: false });
      });
  },
}));

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const basicUser = createUserFromAuthUser(session.user);
    useAuthStore.setState({ user: basicUser, isLoading: false });

    fetchUserProfileWithTimeout(session.user).then((user) => {
      useAuthStore.setState({ user });
    });
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isLoading: false });
  }
});
