import React, { useEffect, useState } from 'react'
import {
  ShieldAlert,
  SlidersHorizontal,
  FileText,
  MapPin,
  Clock,
  MessageSquare,
  Sparkles,
  Upload,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { getCategoryIcon, getStatusBadge } from './MyComplaints.js'
import { toast } from '../components/Toast.js'

interface ComplaintData {
  _id: string
  title: string
  description: string
  category: string
  status: 'Pending' | 'InProgress' | 'Resolved'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  location: {
    latitude: number
    longitude: number
    address: string
  }
  imageUrl?: string
  suggestedCategory?: string
  aiConfidence?: number
  remarks: Array<{
    text: string
    addedBy: {
      name: string
      role: string
    }
    addedAt: string
  }>
  resolutionProofUrl?: string
  createdAt: string
  updatedAt: string
}

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<ComplaintData[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filters state
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterPriority, setFilterPriority] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('All')

  // Status update panel state
  const [updateStatus, setUpdateStatus] = useState<'Pending' | 'InProgress' | 'Resolved'>('InProgress')
  const [updateRemarks, setUpdateRemarks] = useState('')
  const [resolutionFile, setResolutionFile] = useState<File | null>(null)
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchAssignedComplaints = async () => {
    try {
      const res = await api.get('/api/complaints', {
        params: {
          assignedOfficerId: user?.id,
        },
      })
      if (res.data && res.data.success) {
        setComplaints(res.data.complaints)
        // Refresh selected complaint details if one was open
        if (selectedComplaint) {
          const updated = res.data.complaints.find(
            (c: ComplaintData) => c._id === selectedComplaint._id
          )
          if (updated) {
            setSelectedComplaint(updated)
          }
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Failed to query assigned complaints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchAssignedComplaints()
    }
  }, [user?.id])

  const handleSelectComplaint = (complaint: ComplaintData) => {
    setSelectedComplaint(complaint)
    setUpdateStatus(complaint.status)
    setUpdateRemarks('')
    setResolutionFile(null)
    setResolutionPreview(null)
  }

  const handleResolutionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResolutionFile(file)
    setResolutionPreview(URL.createObjectURL(file))
  }

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint) return

    if (!updateRemarks.trim()) {
      toast.warning('Please enter remarks description for the status update.')
      return
    }

    setIsUpdating(true)
    const formData = new FormData()
    formData.append('status', updateStatus)
    formData.append('remarks', updateRemarks)
    if (updateStatus === 'Resolved' && resolutionFile) {
      formData.append('image', resolutionFile)
    }

    try {
      const res = await api.patch(`/api/complaints/${selectedComplaint._id}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (res.data && res.data.success) {
        setUpdateRemarks('')
        setResolutionFile(null)
        setResolutionPreview(null)
        await fetchAssignedComplaints()
      }
    } catch (err: any) {
      console.error(err)
      // Note: Global axios interceptor will also alert, but keeping local feedback is fine.
      // We can let the global interceptor handle error responses, but custom local alerts are helpful.
    } finally {
      setIsUpdating(false)
    }
  }

  // Filter complaints list local logic
  const filteredComplaints = complaints.filter((c) => {
    const matchCat = filterCategory === 'All' || c.category === filterCategory
    const matchPrio = filterPriority === 'All' || c.priority === filterPriority
    const matchStat = filterStatus === 'All' || c.status === filterStatus
    return matchCat && matchPrio && matchStat
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-teal-400 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading Officer Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Officer Panel
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Incidents Workload Console
          </h1>
          <p className="text-sm text-slate-400">
            Investigate, remarks, and confirm resolutions for assigned citizen complaints.
          </p>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          Officer: <span className="text-slate-300 font-bold">{user?.name}</span>
        </div>
      </header>

      {/* Main Workspace: Filters + Master/Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Left Side (2 cols): Filters & Master Complaints list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters card */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="py-4 border-b border-slate-800/60">
              <CardDescription className="flex items-center gap-2 text-slate-300">
                <SlidersHorizontal className="size-4 text-teal-400" />
                Workload Filtering
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-3 gap-4">
              {/* Category Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="filter-cat" className="text-xxs uppercase tracking-wider text-slate-500">
                  Category
                </Label>
                <select
                  id="filter-cat"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                >
                  <option value="All">All Categories</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Garbage">Garbage</option>
                  <option value="BrokenStreetlight">Broken Streetlight</option>
                  <option value="Waterlogging">Waterlogging</option>
                  <option value="FallenTree">Fallen Tree</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="filter-prio" className="text-xxs uppercase tracking-wider text-slate-500">
                  Priority
                </Label>
                <select
                  id="filter-prio"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="filter-stat" className="text-xxs uppercase tracking-wider text-slate-500">
                  Status
                </Label>
                <select
                  id="filter-stat"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Master List */}
          {errorMsg ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
              <ShieldAlert className="size-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
              <CardHeader>
                <CardTitle className="text-lg">No incidents found</CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  You have no matching complaints assigned to your console.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredComplaints.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleSelectComplaint(c)}
                  className={`p-4 border rounded-xl cursor-pointer transition flex items-center justify-between gap-4 ${
                    selectedComplaint?._id === c._id
                      ? 'border-teal-500/80 bg-teal-500/5 shadow-lg shadow-teal-900/10'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg shrink-0">
                      {getCategoryIcon(c.category)}
                    </div>
                    <div className="text-left space-y-1">
                      <h3 className="font-bold text-slate-200 text-sm md:text-base line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="size-3 text-teal-500" />
                        <span className="line-clamp-1 max-w-[280px] md:max-w-md">
                          {c.location.address}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                    {getStatusBadge(c.status)}
                    <span className="inline-flex items-center text-xxs text-slate-500 gap-1">
                      <Clock className="size-3 text-slate-600" />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side (1 col): Detail / Update Panel */}
        <div className="lg:col-span-1">
          {selectedComplaint ? (
            <Card className="border-slate-800 bg-slate-900/50 sticky top-6 shadow-2xl space-y-4">
              <CardHeader className="border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(selectedComplaint.status)}
                  <span className="text-xxs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                    Priority: {selectedComplaint.priority}
                  </span>
                </div>
                <CardTitle className="text-base font-extrabold text-slate-200 line-clamp-2">
                  {selectedComplaint.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 pt-0.5 flex items-center gap-1">
                  <MapPin className="size-3 text-teal-400" />
                  {selectedComplaint.location.address}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Description info */}
                <div className="space-y-1.5">
                  <span className="text-xxs uppercase tracking-wider text-slate-500">
                    Citizen Description
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 max-h-36 overflow-y-auto">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* YOLOv8 AI Insights */}
                {selectedComplaint.suggestedCategory && (
                  <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 flex items-start gap-2">
                    <Sparkles className="size-4 text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-xxs text-teal-300">
                      YOLOv8 AI detected <strong>{selectedComplaint.suggestedCategory}</strong> (
                      {selectedComplaint.aiConfidence
                        ? `${Math.round(selectedComplaint.aiConfidence * 100)}%`
                        : '0%'}{' '}
                      match).
                    </p>
                  </div>
                )}

                {/* Status Update Form */}
                <form onSubmit={handleStatusSubmit} className="border-t border-slate-800/80 pt-4 space-y-4">
                  <h3 className="font-bold text-xs text-slate-200">Submit Status Update</h3>

                  {/* Status Dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="update-status" className="text-xxs uppercase tracking-wider text-slate-500">
                      Change Status To
                    </Label>
                    <select
                      id="update-status"
                      value={updateStatus}
                      onChange={(e) =>
                        setUpdateStatus(e.target.value as 'Pending' | 'InProgress' | 'Resolved')
                      }
                      className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                    >
                      <option value="InProgress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Pending">Pending / Queue</option>
                    </select>
                  </div>

                  {/* Remarks Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="update-remarks" className="text-xxs uppercase tracking-wider text-slate-500">
                      Status Update Remarks
                    </Label>
                    <textarea
                      id="update-remarks"
                      rows={3}
                      value={updateRemarks}
                      onChange={(e) => setUpdateRemarks(e.target.value)}
                      placeholder="Input details on active progress or confirmation of resolution..."
                      className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-teal-500/60 focus:outline-none placeholder:text-slate-600"
                    />
                  </div>

                  {/* Resolution Proof Image Upload */}
                  {updateStatus === 'Resolved' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <Label className="text-xxs uppercase tracking-wider text-slate-500">
                        Resolution Proof Image
                      </Label>
                      <div className="border border-dashed border-slate-800 rounded-lg p-3 bg-slate-950/40 relative flex items-center justify-center">
                        {resolutionPreview ? (
                          <div className="relative w-full h-24 rounded overflow-hidden">
                            <img
                              src={resolutionPreview}
                              alt="Proof preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setResolutionFile(null)
                                setResolutionPreview(null)
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 text-xxs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer text-slate-400 py-2">
                            <Upload className="size-4 text-teal-400" />
                            <span className="text-xs">Upload Photo Proof</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleResolutionFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Update Submit */}
                  {updateStatus === 'Resolved' && !resolutionFile && !selectedComplaint.resolutionProofUrl && (
                    <p className="text-xxs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                      A resolution proof image is required to mark this complaint as resolved. Please upload proof of resolution above.
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      isUpdating ||
                      (updateStatus === 'Resolved' &&
                        !resolutionFile &&
                        !selectedComplaint.resolutionProofUrl)
                    }
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold py-2"
                  >
                    {isUpdating ? 'Submitting...' : 'Apply Status Update'}
                  </Button>
                </form>

                {/* History Remarks list */}
                {selectedComplaint.remarks.length > 0 && (
                  <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
                    <span className="text-xxs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <MessageSquare className="size-3.5 text-slate-400" />
                      Recent Activity Remarks ({selectedComplaint.remarks.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedComplaint.remarks.map((rem, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-950/50 border border-slate-800/60 rounded-lg text-xxs"
                        >
                          <p className="text-slate-300 leading-normal">{rem.text}</p>
                          <p className="text-slate-500 font-semibold pt-1 border-t border-slate-900 mt-1">
                            {rem.addedBy?.name} • {new Date(rem.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-800 bg-slate-900/40 text-center py-24 sticky top-6">
              <CardContent className="space-y-3">
                <FileText className="size-10 text-slate-700 mx-auto" />
                <h3 className="font-bold text-slate-300 text-sm">No Complaint Selected</h3>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-normal">
                  Tap an incident card from the list to display details and apply status updates.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
