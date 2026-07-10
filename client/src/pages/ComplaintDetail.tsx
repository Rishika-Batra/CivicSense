import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import {
  MapPin,
  Clock,
  ArrowLeft,
  User,
  MessageSquare,
  Sparkles,
  CheckCircle,
  FileImage,
  ShieldAlert,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { getCategoryIcon, getStatusBadge } from './MyComplaints.js'

interface Location {
  latitude: number
  longitude: number
  address: string
}

interface Remark {
  text: string
  addedBy: {
    name: string
    role: string
  }
  addedAt: string
}

interface ComplaintDetailData {
  _id: string
  title: string
  description: string
  category: string
  status: 'Pending' | 'InProgress' | 'Resolved'
  priority: string
  location: Location
  imageUrl?: string
  suggestedCategory?: string
  aiConfidence?: number
  assignedOfficerId?: {
    name: string
    email: string
  }
  remarks: Remark[]
  resolutionProofUrl?: string
  createdAt: string
  updatedAt: string
}

export const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const [complaint, setComplaint] = useState<ComplaintDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchComplaintDetail = async () => {
      try {
        const res = await api.get(`/api/complaints/${id}`)
        if (res.data && res.data.success) {
          setComplaint(res.data.complaint)
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg('Failed to load complaint details. You may not have access permission.')
      } finally {
        setLoading(false)
      }
    }

    fetchComplaintDetail()
  }, [id])

  // Initialize Leaflet Map (Read-Only)
  useEffect(() => {
    if (complaint && mapRef.current && !mapInstance.current) {
      const coords: [number, number] = [
        complaint.location.latitude,
        complaint.location.longitude,
      ]

      const map = L.map(mapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView(coords, 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      L.marker(coords).addTo(map)

      mapInstance.current = map
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [complaint])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-teal-400 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading complaint details...</p>
      </div>
    )
  }

  if (errorMsg || !complaint) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/60 backdrop-blur-lg shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="size-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-sm text-slate-400">
              {errorMsg || 'Complaint details could not be loaded.'}
            </p>
          </div>
          <Button onClick={() => navigate('/my-complaints')} className="w-full bg-slate-800 hover:bg-slate-700">
            Back to My Complaints
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />

      <main className="max-w-5xl w-full mx-auto space-y-6 relative">
        {/* Back and Header */}
        <header className="flex flex-row items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/my-complaints')}
              variant="ghost"
              className="text-slate-400 hover:text-white p-2 h-auto"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                {getCategoryIcon(complaint.category)}
                {getStatusBadge(complaint.status)}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Priority: {complaint.priority}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-200">
                {complaint.title}
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden md:inline">
            ID: {complaint._id}
          </span>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns: Details, Map, and Proofs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-400">Description</CardTitle>
              </CardHeader>
              <CardContent className="-mt-2 text-slate-300 text-sm leading-relaxed">
                {complaint.description}
              </CardContent>
            </Card>

            {/* Visual Proofs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Complaint Image */}
              <Card className="border-slate-800 bg-slate-900/50 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-400">Original Image</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-5 pt-0">
                  {complaint.imageUrl ? (
                    <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-800">
                      <img
                        src={complaint.imageUrl}
                        alt="Original proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500 text-xs">
                      <FileImage className="size-8 text-slate-700 mb-2" />
                      No photo submitted
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resolution Proof Image */}
              <Card className="border-slate-800 bg-slate-900/50 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-400">Resolution Proof</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-5 pt-0">
                  {complaint.resolutionProofUrl ? (
                    <div className="w-full h-48 rounded-lg overflow-hidden border border-emerald-500/20">
                      <img
                        src={complaint.resolutionProofUrl}
                        alt="Resolution proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500 text-xs">
                      <CheckCircle className="size-8 text-slate-700 mb-2" />
                      {complaint.status === 'Resolved'
                        ? 'Resolved without image'
                        : 'Awaiting resolution'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Interactive map location */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-400">Location Map</CardTitle>
                <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <MapPin className="size-3.5 text-teal-400 shrink-0" />
                  {complaint.location.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  ref={mapRef}
                  className="w-full h-64 rounded-xl border border-slate-800 overflow-hidden z-0"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Status, Officers, Timeline & Remarks */}
          <div className="space-y-6">
            {/* Officer Assignment */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-400">Assigned Officer</CardTitle>
              </CardHeader>
              <CardContent className="-mt-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 shrink-0 text-slate-400">
                  <User className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">
                    {complaint.assignedOfficerId?.name || 'Awaiting Assignment'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {complaint.assignedOfficerId?.email || 'Auto-routing queued'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Classification Info (if applicable) */}
            {complaint.suggestedCategory && (
              <Card className="border-teal-500/20 bg-teal-500/5">
                <CardContent className="p-4 flex items-start gap-2.5">
                  <Sparkles className="size-5 text-teal-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-teal-200 space-y-1">
                    <p className="font-semibold text-teal-300">YOLOv8 AI Suggested Classification</p>
                    <p>
                      Suggested category: <strong>{complaint.suggestedCategory}</strong> (
                      {complaint.aiConfidence
                        ? `${Math.round(complaint.aiConfidence * 100)}%`
                        : 'N/A'}{' '}
                      confidence match).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-400">Resolution Status</CardTitle>
              </CardHeader>
              <CardContent className="-mt-2 space-y-6">
                {/* 1. Created */}
                <div className="flex gap-3 relative">
                  <div className="w-0.5 bg-slate-800 absolute left-3 top-6 bottom-[-24px] z-0" />
                  <div className="w-6 h-6 bg-teal-500/10 border border-teal-500 text-teal-400 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs">Report Filed</h4>
                    <p className="text-slate-500 text-xxs flex items-center gap-1 mt-0.5">
                      <Clock className="size-3 text-slate-600" />
                      {new Date(complaint.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 2. In Progress */}
                <div className="flex gap-3 relative">
                  <div className="w-0.5 bg-slate-800 absolute left-3 top-6 bottom-[-24px] z-0" />
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold ${
                      complaint.status === 'InProgress' || complaint.status === 'Resolved'
                        ? 'bg-blue-500/10 border border-blue-500 text-blue-400'
                        : 'bg-slate-950 border border-slate-800 text-slate-600'
                    }`}
                  >
                    {complaint.status === 'InProgress' || complaint.status === 'Resolved'
                      ? '✓'
                      : '2'}
                  </div>
                  <div>
                    <h4
                      className={`font-bold text-xs ${
                        complaint.status === 'InProgress' || complaint.status === 'Resolved'
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      In Progress / Assigned
                    </h4>
                    {(complaint.status === 'InProgress' || complaint.status === 'Resolved') && (
                      <p className="text-slate-500 text-xxs flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-slate-600" />
                        Active Investigation
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Resolved */}
                <div className="flex gap-3 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold ${
                      complaint.status === 'Resolved'
                        ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border border-slate-800 text-slate-600'
                    }`}
                  >
                    {complaint.status === 'Resolved' ? '✓' : '3'}
                  </div>
                  <div>
                    <h4
                      className={`font-bold text-xs ${
                        complaint.status === 'Resolved' ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      Issue Resolved
                    </h4>
                    {complaint.status === 'Resolved' && (
                      <p className="text-slate-500 text-xxs flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-slate-600" />
                        {new Date(complaint.updatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remarks Log */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-400">Activity Remarks</CardTitle>
                <MessageSquare className="size-4 text-slate-600" />
              </CardHeader>
              <CardContent className="space-y-4">
                {complaint.remarks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No remarks posted yet.</p>
                ) : (
                  complaint.remarks.map((rem, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-1.5"
                    >
                      <p className="text-xs text-slate-300 leading-normal">{rem.text}</p>
                      <div className="flex items-center justify-between text-xxs text-slate-500 border-t border-slate-900 pt-1.5">
                        <span className="font-semibold text-slate-400">
                          {rem.addedBy?.name} ({rem.addedBy?.role})
                        </span>
                        <span>{new Date(rem.addedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}


