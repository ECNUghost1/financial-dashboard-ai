-- =============================================
-- Supabase 数据库初始化脚本
-- 请在 Supabase SQL Editor 中执行此脚本
-- =============================================

-- 1. 创建用户 profiles 表（存储用户额外信息）
-- 注意：Supabase Auth 已内置 users 表，此表用于存储额外信息
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 创建理财记录表
create table if not exists public.financial_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  platform text not null,
  principal numeric not null,
  interest_rate numeric not null,
  currency text default 'CNY' not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  is_long_term boolean default false not null,
  redemption_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 启用 Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.financial_records enable row level security;

-- 4. 创建 RLS 策略 - 用户只能访问自己的数据

-- profiles 表策略
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- financial_records 表策略
create policy "Users can view own records" on public.financial_records
  for select using (auth.uid() = user_id);

create policy "Users can insert own records" on public.financial_records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own records" on public.financial_records
  for update using (auth.uid() = user_id);

create policy "Users can delete own records" on public.financial_records
  for delete using (auth.uid() = user_id);

-- 5. 创建索引以提高查询性能
create index if not exists idx_financial_records_user_id on public.financial_records(user_id);
create index if not exists idx_financial_records_created_at on public.financial_records(created_at desc);

-- 6. 创建触发器 - 新用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, created_at)
  values (new.id, new.raw_user_meta_data->>'username', now());
  return new;
end;
$$ language plpgsql security definer;

-- 删除已存在的触发器（如果有）
drop trigger if exists on_auth_user_created on auth.users;

-- 创建触发器
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 执行完成后，您可以：
-- 1. 在 Table Editor 中查看创建的表
-- 2. 在 Authentication 中测试用户注册
-- 3. 前端应用将自动使用这些表
-- =============================================