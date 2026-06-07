import { create } from 'zustand';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, AuthResult } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  supabase: SupabaseClient | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, username: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  init: (config: { url: string; anonKey: string }) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  supabase: null,
  
  init: (config) => {
    const supabase = createClient(config.url, config.anonKey);
    set({ supabase });
    
    // 监听认证状态变化
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await fetchUserProfile(supabase, session.user.id);
        set({ user, isLoading: false });
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, isLoading: false });
      }
    });
  },
  
  login: async (email: string, password: string) => {
    const { supabase } = get();
    if (!supabase) return { success: false, error: '请先初始化认证服务' };
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: '登录失败' };
      
      const user = await fetchUserProfile(supabase, data.user.id);
      set({ user, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: '网络错误，请稍后重试' };
    }
  },
  
  register: async (email: string, password: string, username: string) => {
    const { supabase } = get();
    if (!supabase) return { success: false, error: '请先初始化认证服务' };
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      
      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: '注册失败' };
      
      // 创建用户profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        created_at: new Date().toISOString(),
      });
      
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        username,
        created_at: data.user.created_at || new Date().toISOString(),
      };
      
      set({ user, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: '网络错误，请稍后重试' };
    }
  },
  
  logout: async () => {
    const { supabase } = get();
    if (supabase) await supabase.auth.signOut();
    set({ user: null, isLoading: false });
  },
  
  checkAuth: async () => {
    const { supabase } = get();
    if (!supabase) {
      set({ user: null, isLoading: false });
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const user = await fetchUserProfile(supabase, session.user.id);
        set({ user, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));

async function fetchUserProfile(supabase: SupabaseClient, userId: string): Promise<User> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return {
    id: userId,
    email: profile?.email || '',
    username: profile?.username || '',
    created_at: profile?.created_at || new Date().toISOString(),
  };
}