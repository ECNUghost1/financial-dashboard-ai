# 理财收益追踪 Dashboard

一个基于 React + TypeScript 的个人理财收益追踪系统，支持多币种理财记录管理、交易历史变更追踪、以及按月/按年的收益统计日历。

## 功能特性

### 核心功能

- **理财记录管理**：添加、编辑、赎回各类理财产品（支持 CNY、USD、EUR、GBP、JPY、HKD 多种币种）
- **交易历史追踪**：记录每次本金/利率变更，支持分段收益计算，确保历史数据不被当前变更影响
- **理财日历视图**：可视化展示每日已到账收益，点击日期查看当日明细（支持 T+1 收益发放逻辑，每天早 8:00 结算）
- **月度/年度统计**：自动汇总每个月、每年的总收益，支持按币种换算
- **到期倒计时**：显示每个理财的到期日剩余天数
- **本金/利率变更**：通过交易历史功能修改本金或利率，所有变更带有生效日期，历史收益不受影响

### 计息规则

- 利息从开始日期当天开始计算
- 收益 T+1 发放，即当天的利息在第二天早 8:00 后到账并显示在日历中
- 分段收益：如果中途变更了本金或利率，系统会按时间段分别计算各段收益
- 已赎回记录：收益计算截止到赎回日期

## 技术栈

| 类别 | 技术 |
| --- | --- |
| **前端框架** | React 19 + TypeScript |
| **构建工具** | Vite 6 |
| **样式方案** | Tailwind CSS 3 |
| **状态管理** | Zustand |
| **后端服务** | Supabase（PostgreSQL + Auth） |
| **路由** | React Router 7 |
| **图标** | Lucide React |

## 项目结构

```
.
├── src/
│   ├── components/           # 可复用组件
│   │   ├── Auth/             # 登录 / 注册表单
│   │   ├── Dashboard/        # 看板卡片、统计卡片
│   │   ├── Form/             # 记录表单
│   │   └── Layout/           # 页面布局（导航栏等）
│   ├── hooks/                # 业务逻辑 Hooks
│   │   ├── useRecords.ts        # 理财记录数据获取与汇总
│   │   └── useTransactionHistory.ts # 交易历史操作
│   ├── pages/                # 路由页面
│   │   ├── Dashboard.tsx        # 主看板
│   │   ├── AddRecord.tsx        # 添加记录
│   │   ├── EditRecord.tsx       # 编辑记录
│   │   ├── RecordHistory.tsx    # 交易历史
│   │   ├── Calendar.tsx         # 理财日历（本月重点功能）
│   │   ├── Login.tsx / Register.tsx
│   ├── store/                # Zustand 状态（Auth）
│   ├── types/                # 全局 TypeScript 类型
│   ├── utils/                # 工具函数
│   │   ├── calculations.ts      # 计息、天数计算
│   │   ├── exchangeRate.ts      # 币种换算（静态汇率）
│   │   ├── timezone.ts          # 本地/UTC 时间转换
│   │   ├── transactionHistory.ts # 分段收益生成
│   │   └── supabase.ts          # Supabase 客户端
│   └── App.tsx / main.tsx    # 应用入口
├── supabase/
│   └── schema.sql            # 数据库表结构
├── index.html / vite.config.ts / ...
└── package.json
```

## 数据库表结构

详见 [supabase/schema.sql](supabase/schema.sql)，核心表：

- **`users`**：用户表（通过 Supabase Auth 管理）
- **`financial_records`**：理财记录（包含 `initial_principal`、`initial_interest_rate` 用于保存变更前的原始值）
- **`transaction_history`**：交易历史（每一次本金/利率变更都在此表记录一条，并带有 `effective_date` 生效日期）

## 快速开始

### 1. 环境准备

- Node.js >= 18
- 一个已创建的 Supabase 项目，并完成 schema.sql 的表结构初始化

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```env
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
```

### 3. 安装依赖 & 启动开发服务器

```bash
npm install
npm run dev
```

浏览器访问默认地址 `http://localhost:5173`。

### 4. 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/`，可直接部署到静态托管（Cloudflare Pages、Vercel、Netlify 等）。

## 功能使用说明

### 添加理财记录

1. 登录后进入首页（Dashboard），点击右上角「添加记录」
2. 填写：平台名称、本金、年利率、币种、开始日期、结束日期（或勾选「长期持有」）
3. 保存后即可在看板看到每日 / 每月 / 累计收益预览

### 修改本金或利率

> 已存在的理财记录**不允许直接修改本金/利率**（避免历史收益计算混乱）。

如需变更，请：
1. 在 Dashboard 找到对应记录卡片，点击「历史 / 变更记录」
2. 在交易历史页面添加一条新的变更，设置生效日期
3. 系统会自动：
   - 用 `initial_principal` / `initial_interest_rate` 保留原始值用于历史计算
   - 在生成日历收益时按时间分段应用不同的本金/利率

### 赎回记录

在记录卡片点击「赎回」并选择赎回日期即可。赎回后：
- 该记录不再参与后续每日利息计算
- 已产生的收益仍会在日历中正确显示

### 理财日历

进入导航栏「理财日历」页面：
- 日历格子显示当天所有理财的收益合计（以美元汇总）
- 点击任意有收益的日期，下方会显示每一条理财的当日收益明细
- 月度统计：汇总当月每天收益（与日历每日加总完全一致）
- 年度统计：汇总每个月收益

**重要说明**：日历中看到的是「已到账」收益。由于采用 T+1 发放规则，6 月 1 日的利息会出现在 6 月 2 日的格子中（早 8:00 以后）。

## 开发相关

### 关键文件一览

| 文件 | 作用 |
| --- | --- |
| [src/utils/calculations.ts](src/utils/calculations.ts) | 每日利息、计息天数（考虑 8 点分界）、累计收益 |
| [src/utils/transactionHistory.ts](src/utils/transactionHistory.ts) | 生成利息周期分段 |
| [src/pages/Calendar.tsx](src/pages/Calendar.tsx) | 理财日历页面（每日收益 + 月/年度统计） |
| [src/hooks/useRecords.ts](src/hooks/useRecords.ts) | 记录列表获取、添加、编辑、删除、赎回、汇总 |
| [supabase/schema.sql](supabase/schema.sql) | 数据库表结构与示例数据 |

### 校验

```bash
npm run lint   # ESLint 检查
npm run build  # TypeScript 类型检查 + Vite 构建
```

## License

MIT
