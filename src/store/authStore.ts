import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  
  login: async (email: string, password: string): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: User) => u.email === email && u.password === password);
      
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        set({ user, isLoading: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
  
  register: async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const exists = users.some((u: User) => u.email === email);
      
      if (exists) {
        return false;
      }
      
      const newUser: User = {
        id: Date.now().toString(),
        email,
        password,
        username,
        created_at: new Date().toISOString(),
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      set({ user: newUser, isLoading: false });
      return true;
    } catch {
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('currentUser');
    set({ user: null, isLoading: false });
  },
  
  checkAuth: () => {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        set({ user: JSON.parse(currentUser), isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
