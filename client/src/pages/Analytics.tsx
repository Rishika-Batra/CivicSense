import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart2,
  MapPin,
  RefreshCw,
  Activity,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusPoint { status: string; count: number }
interface CategoryPoint { category: string; count: number }
interface PriorityPoint { priority: string; count: number }
interface MonthPoint {
  year: number
  month: number
  count: number
  resolved: number
  pending: number
  inProgress: number
}
interface AreaPoint { address: string; count: number }

interface AnalyticsData {
  totalComplaints: number
  statusBreakdown: StatusPoint[]
  categoryBreakdown: CategoryPoint[]
  priorityBreakdown: PriorityPoint[]
  monthlyTrend: MonthPoint[]
  avgResolutionHours: number | null
  totalResolved: number
  topAreas: AreaPoint[]
}

// ─── Color Palettes ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  InProgress: '#3b82f6',
  Resolved: '#10b981',
}

const CATEGORY_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899',
]

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981',
}

// ─── Month Labels ─────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatMonth = (m: MonthPoint) => `${MONTH_NAMES[m.month - 1]} '${String(m.year).slice(2)}`

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  gradient: string
  glow: string
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, gradient, glow }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-3 group hover:border-slate-700 transition-all duration-300 ${glow}`}>
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient} blur-2xl`} />
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
        {icon}
      </div>
    </div>
  </div>
)

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[130px]">
      {label && <p className="text-slate-400 font-semibold border-b border-slate-800 pb-1 mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-bold text-slate-200">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/analytics')
      if (res.data.success) setData(res.data.analytics)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message ?? 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-teal-400">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Crunching numbers…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-red-400 p-6">
        <AlertCircle className="size-12" />
        <p className="text-lg font-semibold">{error}</p>
        <Button onClick={fetchAnalytics} className="bg-slate-800 text-slate-300 hover:bg-slate-700">
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  // Derived metrics
  const resolutionRate =
    data.totalComplaints > 0
      ? Math.round((data.totalResolved / data.totalComplaints) * 100)
      : 0

  const pendingCount = data.statusBreakdown.find((s) => s.status === 'Pending')?.count ?? 0
  const inProgressCount = data.statusBreakdown.find((s) => s.status === 'InProgress')?.count ?? 0

  // Prepare monthly trend for recharts
  const trendData = data.monthlyTrend.map((m) => ({
    name: formatMonth(m),
    Total: m.count,
    Resolved: m.resolved,
    Pending: m.pending,
    'In Progress': m.inProgress,
  }))

  // Category bar data — humanise "BrokenStreetlight" etc.
  const categoryLabels: Record<string, string> = {
    BrokenStreetlight: 'Streetlight',
    Waterlogging: 'Flooding',
    FallenTree: 'Fallen Tree',
  }
  const categoryData = data.categoryBreakdown.map((c) => ({
    name: categoryLabels[c.category] ?? c.category,
    Count: c.count,
    fullName: c.category,
  }))

  // Status donut data
  const statusData = data.statusBreakdown.map((s) => ({
    name: s.status === 'InProgress' ? 'In Progress' : s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? '#64748b',
  }))

  // Priority bar data
  const priorityData = ['Critical', 'High', 'Medium', 'Low'].map((p) => ({
    name: p,
    Count: data.priorityBreakdown.find((x) => x.priority === p)?.count ?? 0,
    fill: PRIORITY_COLORS[p],
  }))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-violet-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Activity className="size-3" /> Analytics Console
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Platform Intelligence
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time operational insights across all CivicSense complaint data.
            </p>
          </div>
          <Button
            onClick={fetchAnalytics}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 h-9 text-xs self-start md:self-end"
          >
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh Data
          </Button>
        </header>

        {/* ── KPI Stat Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Complaints"
            value={data.totalComplaints.toLocaleString()}
            sub="All time"
            icon={<BarChart2 className="size-5 text-violet-400" />}
            gradient="bg-gradient-to-br from-violet-500/10 to-transparent"
            glow="hover:shadow-lg hover:shadow-violet-900/20"
          />
          <StatCard
            label="Resolved"
            value={data.totalResolved.toLocaleString()}
            sub={`${resolutionRate}% resolution rate`}
            icon={<CheckCircle className="size-5 text-emerald-400" />}
            gradient="bg-gradient-to-br from-emerald-500/10 to-transparent"
            glow="hover:shadow-lg hover:shadow-emerald-900/20"
          />
          <StatCard
            label="Avg Resolution"
            value={data.avgResolutionHours != null ? `${data.avgResolutionHours}h` : 'N/A'}
            sub="For resolved complaints"
            icon={<Clock className="size-5 text-blue-400" />}
            gradient="bg-gradient-to-br from-blue-500/10 to-transparent"
            glow="hover:shadow-lg hover:shadow-blue-900/20"
          />
          <StatCard
            label="Needs Attention"
            value={(pendingCount + inProgressCount).toLocaleString()}
            sub={`${pendingCount} pending · ${inProgressCount} in progress`}
            icon={<Zap className="size-5 text-amber-400" />}
            gradient="bg-gradient-to-br from-amber-500/10 to-transparent"
            glow="hover:shadow-lg hover:shadow-amber-900/20"
          />
        </div>

        {/* ── Row 1: Monthly Trend (full width) ───────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="size-4 text-violet-400" />
                  Monthly Complaint Trend
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Last 12 months — volume by status
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '16px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#gradTotal)"
                  dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="Resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradResolved)"
                  dot={{ fill: '#10b981', r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="Pending"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  fill="none"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Row 2: Category Bar + Status Donut ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Category Bar Chart (3 cols) */}
          <Card className="lg:col-span-3 border-slate-800 bg-slate-900/50">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <BarChart2 className="size-4 text-teal-400" />
                Complaints by Category
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Volume across all issue types</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Count" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_entry, index) => (
                      <Cell
                        key={index}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        fillOpacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Donut (2 cols) */}
          <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Activity className="size-4 text-purple-400" />
                Status Distribution
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Complaint pipeline breakdown</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2 flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span>{s.name}</span>
                    <span className="text-slate-200 font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: Priority Bar + Top Areas ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Bar Chart */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                Complaints by Priority
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Urgency distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Areas */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <MapPin className="size-4 text-pink-400" />
                Top Complaint Areas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Highest volume locations</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {data.topAreas.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">No location data yet.</p>
              ) : (
                data.topAreas.map((area, idx) => {
                  const maxCount = data.topAreas[0]?.count ?? 1
                  const pct = Math.round((area.count / maxCount) * 100)
                  const colors = ['bg-violet-500', 'bg-teal-500', 'bg-blue-500', 'bg-amber-500', 'bg-pink-500']
                  const barColor = colors[idx % colors.length]
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 line-clamp-1 max-w-[200px] md:max-w-xs" title={area.address}>
                          <span className="text-slate-600 mr-1.5">#{idx + 1}</span>
                          {area.address}
                        </span>
                        <span className="text-slate-400 font-bold shrink-0 ml-2">{area.count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 pb-4">
          Data aggregated across all CivicSense complaint records • Refreshed on demand
        </p>
      </div>
    </div>
  )
}
