import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Building2,
  ClipboardList,
  Shield,
  ShieldAlert,
  ChevronDown,
  Trash2,
  UserCog,
  Plus,
  RefreshCw,
  CheckCircle,
  UserX,
  Pencil,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { getCategoryIcon, getStatusBadge } from './MyComplaints.js'
import { toast } from '../components/Toast.js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserData {
  _id: string
  name: string
  email: string
  role: string
  department?: { _id: string; name: string }
  createdAt: string
}

interface DeptData {
  _id: string
  name: string
  description?: string
  officers: Array<{ _id: string; name: string; email: string; role: string }>
  categoryMappings: Record<string, string[]>
  createdAt: string
}

interface ComplaintSummary {
  _id: string
  title: string
  category: string
  status: string
  priority: string
  location: { address: string }
  userId?: { name: string; email: string }
  assignedOfficerId?: { _id: string; name: string; email: string }
  createdAt: string
}

const CATEGORIES = ['Pothole', 'Garbage', 'BrokenStreetlight', 'Waterlogging', 'FallenTree', 'Other']
const ROLES = ['citizen', 'officer', 'admin']

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string, string> = {
    admin: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    officer: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
    citizen: 'bg-slate-700/60 text-slate-400 border-slate-700',
    deactivated: 'bg-red-500/15 text-red-400 border-red-500/25',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold border ${map[role] ?? map.citizen}`}>
      {role}
    </span>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, string> = {
    Critical: 'bg-red-500/15 text-red-400 border-red-500/25',
    High: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold border ${map[priority] ?? ''}`}>
      {priority}
    </span>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

type Tab = 'users' | 'assignments' | 'departments'

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  // ── Users State ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserData[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('All')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // ── Departments State ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<DeptData[]>([])
  const [deptsLoading, setDeptsLoading] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })
  const [editingDept, setEditingDept] = useState<DeptData | null>(null)
  const [deptOfficerMap, setDeptOfficerMap] = useState<Record<string, string[]>>({})
  const [deptCatMap, setDeptCatMap] = useState<Record<string, Record<string, string[]>>>({})
  const [savingDept, setSavingDept] = useState(false)
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null)

  // ── Assignments State ─────────────────────────────────────────────────────────
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [assignFilter, setAssignFilter] = useState({ status: '', category: '' })
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignOfficerIdMap, setAssignOfficerIdMap] = useState<Record<string, string>>({})

  // ── Officers list (for assignment dropdowns) ──────────────────────────────────
  const [officersList, setOfficersList] = useState<UserData[]>([])

  // ─── Fetch Functions ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const params: Record<string, string> = {}
      if (userRoleFilter !== 'All') params.role = userRoleFilter
      if (userSearch) params.search = userSearch
      const res = await api.get('/api/admin/users', { params })
      if (res.data.success) setUsers(res.data.users)
    } catch (err) {
      console.error(err)
    } finally {
      setUsersLoading(false)
    }
  }, [userRoleFilter, userSearch])

  const fetchDepartments = useCallback(async () => {
    setDeptsLoading(true)
    try {
      const res = await api.get('/api/admin/departments')
      if (res.data.success) {
        const depts: DeptData[] = res.data.departments
        setDepartments(depts)
        // Initialise local state maps
        const oMap: Record<string, string[]> = {}
        const cMap: Record<string, Record<string, string[]>> = {}
        depts.forEach((d) => {
          oMap[d._id] = d.officers.map((o) => o._id)
          cMap[d._id] = d.categoryMappings ?? {}
        })
        setDeptOfficerMap(oMap)
        setDeptCatMap(cMap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeptsLoading(false)
    }
  }, [])

  const fetchComplaints = useCallback(async () => {
    setComplaintsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (assignFilter.status) params.status = assignFilter.status
      if (assignFilter.category) params.category = assignFilter.category
      const res = await api.get('/api/admin/complaints', { params })
      if (res.data.success) setComplaints(res.data.complaints)
    } catch (err) {
      console.error(err)
    } finally {
      setComplaintsLoading(false)
    }
  }, [assignFilter])

  const fetchOfficers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users', { params: { role: 'officer', limit: 200 } })
      if (res.data.success) setOfficersList(res.data.users)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { fetchDepartments() }, [fetchDepartments])
  useEffect(() => { fetchComplaints() }, [fetchComplaints])
  useEffect(() => { fetchOfficers() }, [fetchOfficers])

  // ─── User Management Handlers ─────────────────────────────────────────────────

  const handleChangeRole = async (userId: string, newRole: string) => {
    const targetUser = users.find((u) => u._id === userId)
    const targetName = targetUser ? targetUser.name : 'this user'

    if (newRole === 'admin') {
      const confirmed = window.confirm(
        `Are you sure you want to grant admin access to ${targetName}? This gives them full system control.`
      )
      if (!confirmed) {
        // Re-trigger render to revert the select element selection in the UI
        setUsers([...users])
        return
      }
    }

    setUpdatingUserId(userId)
    try {
      await api.patch(`/api/admin/users/${userId}`, { role: newRole })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u))
      toast.success('User role updated successfully.')
    } catch (err: any) {
      // Handled by global Axios interceptor, but keep log for debug
      console.error(err)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user? They will lose all access.')) return
    setUpdatingUserId(userId)
    try {
      await api.patch(`/api/admin/users/${userId}`, { deactivate: true })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: 'deactivated' } : u))
      toast.success('User deactivated successfully.')
    } catch (err: any) {
      console.error(err)
    } finally {
      setUpdatingUserId(null)
    }
  }

  // ─── Department Handlers ──────────────────────────────────────────────────────

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptForm.name.trim()) return
    setSavingDept(true)
    try {
      const res = await api.post('/api/admin/departments', deptForm)
      if (res.data.success) {
        setDeptForm({ name: '', description: '' })
        toast.success('Department created successfully.')
        await fetchDepartments()
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSavingDept(false)
    }
  }

  const handleSaveDept = async (deptId: string) => {
    setSavingDept(true)
    try {
      await api.patch(`/api/admin/departments/${deptId}`, {
        officers: deptOfficerMap[deptId] ?? [],
        categoryMappings: deptCatMap[deptId] ?? {},
      })
      setEditingDept(null)
      toast.success('Department configurations saved.')
      await fetchDepartments()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSavingDept(false)
    }
  }

  const handleDeleteDept = async (deptId: string) => {
    if (!confirm('Delete this department? This will unlink all its officers.')) return
    setDeletingDeptId(deptId)
    try {
      await api.delete(`/api/admin/departments/${deptId}`)
      toast.success('Department deleted successfully.')
      await fetchDepartments()
    } catch (err: any) {
      console.error(err)
    } finally {
      setDeletingDeptId(null)
    }
  }

  const toggleDeptOfficer = (deptId: string, officerId: string) => {
    setDeptOfficerMap((prev) => {
      const current = prev[deptId] ?? []
      return {
        ...prev,
        [deptId]: current.includes(officerId)
          ? current.filter((id) => id !== officerId)
          : [...current, officerId],
      }
    })
  }

  const toggleCatOfficer = (deptId: string, cat: string, officerId: string) => {
    setDeptCatMap((prev) => {
      const deptMap = { ...(prev[deptId] ?? {}) }
      const existing = deptMap[cat] ?? []
      deptMap[cat] = existing.includes(officerId)
        ? existing.filter((id) => id !== officerId)
        : [...existing, officerId]
      return { ...prev, [deptId]: deptMap }
    })
  }

  // ─── Assignment Handlers ──────────────────────────────────────────────────────

  const handleAssign = async (complaintId: string) => {
    const officerId = assignOfficerIdMap[complaintId]
    if (!officerId) {
      toast.warning('Select an officer first.')
      return
    }
    setAssigningId(complaintId)
    try {
      await api.patch(`/api/complaints/${complaintId}/assign`, { assignedOfficerId: officerId })
      toast.success('Complaint assigned successfully.')
      await fetchComplaints()
      setAssignOfficerIdMap((prev) => { const n = { ...prev }; delete n[complaintId]; return n })
    } catch (err: any) {
      console.error(err)
    } finally {
      setAssigningId(null)
    }
  }

  // ─── Tabs Config ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'User Management', icon: <Users className="size-4" /> },
    { id: 'assignments', label: 'Complaint Assignment', icon: <ClipboardList className="size-4" /> },
    { id: 'departments', label: 'Departments', icon: <Building2 className="size-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Shield className="size-3" /> Admin Console
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              System Administration
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage users, departments, and complaint assignments across CivicSense.
            </p>
          </div>
          <p className="text-xs font-mono text-slate-500">
            Logged in as <span className="text-purple-400 font-bold">{user?.name}</span>
          </p>
        </header>

        {/* Tab Bar */}
        <nav className="flex gap-2 border-b border-slate-800 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── USERS TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 min-w-[160px]"
              >
                <option value="All">All Roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                <option value="deactivated">Deactivated</option>
              </select>
              <Button
                onClick={fetchUsers}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              >
                <RefreshCw className="size-4 mr-1" /> Refresh
              </Button>
            </div>

            {/* Table */}
            {usersLoading ? (
              <div className="flex items-center justify-center py-20 text-teal-400 gap-3">
                <div className="w-6 h-6 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                Loading users…
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Name</th>
                        <th className="text-left px-4 py-3">Email</th>
                        <th className="text-left px-4 py-3">Role</th>
                        <th className="text-left px-4 py-3">Department</th>
                        <th className="text-left px-4 py-3">Joined</th>
                        <th className="text-left px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, idx) => (
                        <tr
                          key={u._id}
                          className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-900/30'}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-full bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center text-xxs font-bold text-purple-300">
                                {u.name[0]?.toUpperCase()}
                              </div>
                              {u.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {u.department?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Role change dropdown */}
                              {u._id !== user?.id && u.role !== 'deactivated' && (
                                <div className="relative">
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleChangeRole(u._id, e.target.value)}
                                    disabled={updatingUserId === u._id}
                                    className="appearance-none rounded border border-slate-700 bg-slate-800 text-slate-200 text-xs py-1 pl-2 pr-6 cursor-pointer disabled:opacity-50"
                                  >
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                  <ChevronDown className="size-3 absolute right-1.5 top-1.5 text-slate-500 pointer-events-none" />
                                </div>
                              )}
                              {/* Deactivate / already deactivated indicator */}
                              {u._id !== user?.id && u.role !== 'deactivated' && (
                                <button
                                  onClick={() => handleDeactivate(u._id)}
                                  disabled={updatingUserId === u._id}
                                  title="Deactivate user"
                                  className="p-1 rounded hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition disabled:opacity-40"
                                >
                                  <UserX className="size-3.5" />
                                </button>
                              )}
                              {u.role === 'deactivated' && (
                                <span className="text-xxs text-red-400 flex items-center gap-1">
                                  <ShieldAlert className="size-3" /> Deactivated
                                </span>
                              )}
                              {u._id === user?.id && (
                                <span className="text-xxs text-purple-400">(You)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-slate-500 py-12 text-sm">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={assignFilter.status}
                onChange={(e) => setAssignFilter((f) => ({ ...f, status: e.target.value }))}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="InProgress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <select
                value={assignFilter.category}
                onChange={(e) => setAssignFilter((f) => ({ ...f, category: e.target.value }))}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button
                onClick={fetchComplaints}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              >
                <RefreshCw className="size-4 mr-1" /> Refresh
              </Button>
            </div>

            {/* Complaints Assignment Table */}
            {complaintsLoading ? (
              <div className="flex items-center justify-center py-20 text-teal-400 gap-3">
                <div className="w-6 h-6 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                Loading complaints…
              </div>
            ) : (
              <div className="grid gap-3">
                {complaints.map((c) => (
                  <Card key={c._id} className="border-slate-800 bg-slate-900/50">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
                          {getCategoryIcon(c.category)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-bold text-slate-200 text-sm line-clamp-1">{c.title}</h3>
                          <p className="text-xs text-slate-500 line-clamp-1">{c.location.address}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {getStatusBadge(c.status as 'Pending' | 'InProgress' | 'Resolved')}
                            <PriorityBadge priority={c.priority} />
                            <span className="text-xxs text-slate-600">by {c.userId?.name ?? 'Unknown'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assignment controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {c.assignedOfficerId ? (
                          <span className="text-xs text-teal-400 flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 py-1.5">
                            <UserCog className="size-3.5" />
                            {c.assignedOfficerId.name}
                          </span>
                        ) : (
                          <span className="text-xxs text-slate-500 italic">Unassigned</span>
                        )}
                        <select
                          value={assignOfficerIdMap[c._id] ?? ''}
                          onChange={(e) =>
                            setAssignOfficerIdMap((prev) => ({ ...prev, [c._id]: e.target.value }))
                          }
                          className="rounded border border-slate-700 bg-slate-800 text-slate-200 text-xs py-1.5 px-2"
                        >
                          <option value="">Select officer…</option>
                          {officersList.map((o) => (
                            <option key={o._id} value={o._id}>{o.name}</option>
                          ))}
                        </select>
                        <Button
                          onClick={() => handleAssign(c._id)}
                          disabled={assigningId === c._id || !assignOfficerIdMap[c._id]}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 h-auto disabled:opacity-40"
                        >
                          {assigningId === c._id ? '…' : 'Assign'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {complaints.length === 0 && (
                  <Card className="border-slate-800 bg-slate-900/50 text-center py-16">
                    <CardContent className="space-y-2 pt-6">
                      <ClipboardList className="size-10 text-slate-700 mx-auto" />
                      <p className="text-slate-400 font-medium">No complaints found</p>
                      <p className="text-slate-600 text-sm">Try adjusting the filters above.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DEPARTMENTS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            {/* Create Department Form */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="size-4 text-teal-400" /> Create New Department
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleCreateDept} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="dept-name" className="text-xxs uppercase tracking-wider text-slate-500">
                      Department Name
                    </Label>
                    <Input
                      id="dept-name"
                      placeholder="e.g. Roads & Infrastructure"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="dept-desc" className="text-xxs uppercase tracking-wider text-slate-500">
                      Description (optional)
                    </Label>
                    <Input
                      id="dept-desc"
                      placeholder="Short description…"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="submit"
                      disabled={savingDept || !deptForm.name.trim()}
                      className="bg-teal-600 hover:bg-teal-500 text-white h-10"
                    >
                      {savingDept ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Departments List */}
            {deptsLoading ? (
              <div className="flex items-center justify-center py-20 text-teal-400 gap-3">
                <div className="w-6 h-6 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                Loading departments…
              </div>
            ) : (
              <div className="grid gap-4">
                {departments.map((dept) => {
                  const isEditing = editingDept?._id === dept._id
                  const localOfficers = deptOfficerMap[dept._id] ?? []
                  const localCatMap = deptCatMap[dept._id] ?? {}
                  const officersInDept = officersList.filter((o) => localOfficers.includes(o._id))

                  return (
                    <Card key={dept._id} className="border-slate-800 bg-slate-900/50">
                      <CardHeader className="border-b border-slate-800/60 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                              <Building2 className="size-4 text-purple-400" />
                              {dept.name}
                            </CardTitle>
                            {dept.description && (
                              <CardDescription className="text-xs text-slate-500 mt-0.5">
                                {dept.description}
                              </CardDescription>
                            )}
                            <p className="text-xxs text-slate-600 mt-1">
                              {dept.officers.length} officer{dept.officers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setEditingDept(isEditing ? null : dept)}
                              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                              title={isEditing ? 'Cancel' : 'Edit'}
                            >
                              {isEditing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteDept(dept._id)}
                              disabled={deletingDeptId === dept._id}
                              className="p-1.5 rounded-lg border border-red-900/40 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition disabled:opacity-40"
                              title="Delete department"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        {/* Officer Assignments */}
                        {isEditing ? (
                          <div className="space-y-4">
                            {/* Officer membership */}
                            <div className="space-y-2">
                              <Label className="text-xxs uppercase tracking-wider text-slate-500">
                                Department Officers
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {officersList.map((o) => {
                                  const selected = localOfficers.includes(o._id)
                                  return (
                                    <button
                                      key={o._id}
                                      type="button"
                                      onClick={() => toggleDeptOfficer(dept._id, o._id)}
                                      className={`px-2.5 py-1 rounded-full text-xxs font-semibold border transition ${
                                        selected
                                          ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                          : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300'
                                      }`}
                                    >
                                      {selected && <CheckCircle className="size-2.5 inline mr-1" />}
                                      {o.name}
                                    </button>
                                  )
                                })}
                                {officersList.length === 0 && (
                                  <p className="text-xxs text-slate-600">No officers in system yet.</p>
                                )}
                              </div>
                            </div>

                            {/* Category → Officer mappings */}
                            <div className="space-y-2">
                              <Label className="text-xxs uppercase tracking-wider text-slate-500">
                                Category Mappings (Auto-assign by issue type)
                              </Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {CATEGORIES.map((cat) => {
                                  const assignedInCat = localCatMap[cat] ?? []
                                  return (
                                    <div key={cat} className="space-y-1.5 p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                                      <p className="text-xxs font-semibold text-slate-400 flex items-center gap-1.5">
                                        {getCategoryIcon(cat)}
                                        {cat}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {officersInDept.map((o) => {
                                          const sel = assignedInCat.includes(o._id)
                                          return (
                                            <button
                                              key={o._id}
                                              type="button"
                                              onClick={() => toggleCatOfficer(dept._id, cat, o._id)}
                                              className={`px-2 py-0.5 rounded-full text-xxs border transition ${
                                                sel
                                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                              }`}
                                            >
                                              {o.name}
                                            </button>
                                          )
                                        })}
                                        {officersInDept.length === 0 && (
                                          <span className="text-xxs text-slate-600">Add officers to dept first</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Save Button */}
                            <Button
                              onClick={() => handleSaveDept(dept._id)}
                              disabled={savingDept}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-sm"
                            >
                              {savingDept ? 'Saving…' : 'Save Department Config'}
                            </Button>
                          </div>
                        ) : (
                          /* Read-only summary */
                          <div className="space-y-3">
                            {/* Officers */}
                            <div className="flex flex-wrap gap-2">
                              {dept.officers.length > 0 ? dept.officers.map((o) => (
                                <span key={o._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xxs font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-300">
                                  <UserCog className="size-2.5" /> {o.name}
                                </span>
                              )) : (
                                <p className="text-xxs text-slate-600">No officers assigned. Click edit to configure.</p>
                              )}
                            </div>

                            {/* Category mapping preview */}
                            {Object.keys(dept.categoryMappings ?? {}).filter(
                              (k) => (dept.categoryMappings[k]?.length ?? 0) > 0
                            ).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {CATEGORIES.filter((cat) => (dept.categoryMappings[cat]?.length ?? 0) > 0).map((cat) => (
                                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs bg-slate-800 border border-slate-700 text-slate-400">
                                    {getCategoryIcon(cat)}
                                    {cat}: {(dept.categoryMappings[cat]?.length ?? 0)} officer{(dept.categoryMappings[cat]?.length ?? 0) !== 1 ? 's' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}

                {departments.length === 0 && (
                  <Card className="border-slate-800 bg-slate-900/50 text-center py-16">
                    <CardContent className="space-y-2 pt-6">
                      <Building2 className="size-10 text-slate-700 mx-auto" />
                      <p className="text-slate-400 font-medium">No departments yet</p>
                      <p className="text-slate-600 text-sm">Create one using the form above.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
