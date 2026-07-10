import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trash2,
  Lightbulb,
  Droplets,
  TreePine,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

interface ComplaintSummary {
  _id: string
  title: string
  category: string
  status: 'Pending' | 'InProgress' | 'Resolved'
  priority: string
  createdAt: string
  location: {
    address: string
  }
}

// Map categories to Lucide icons
export const getCategoryIcon = (category: string, className = 'size-5') => {
  switch (category) {
    case 'Pothole':
      return <AlertTriangle className={`${className} text-amber-500`} />
    case 'Garbage':
      return <Trash2 className={`${className} text-emerald-500`} />
    case 'BrokenStreetlight':
      return <Lightbulb className={`${className} text-yellow-400`} />
    case 'Waterlogging':
      return <Droplets className={`${className} text-blue-500`} />
    case 'FallenTree':
      return <TreePine className={`${className} text-green-500`} />
    default:
      return <HelpCircle className={`${className} text-slate-400`} />
  }
}

// Map status to Tailwind class badges
export const getStatusBadge = (status: 'Pending' | 'InProgress' | 'Resolved') => {
  switch (status) {
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Resolved
        </span>
      )
    case 'InProgress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          In Progress
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Pending
        </span>
      )
  }
}

export const MyComplaints: React.FC = () => {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await api.get('/api/complaints/my')
        if (res.data && res.data.success) {
          setComplaints(res.data.complaints)
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg('Failed to load your complaints history.')
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-teal-400 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading complaints history...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />

      <main className="max-w-4xl w-full mx-auto space-y-6 relative">
        <header className="flex flex-row items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-slate-400 hover:text-white p-2 h-auto"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                My Filed Complaints
              </h1>
              <p className="text-sm text-slate-400">
                Track issues reported by you and monitor their resolution timeline.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/report')}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold px-4 py-2"
          >
            Report New Issue
          </Button>
        </header>

        {errorMsg ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2">
            <ShieldAlert className="size-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : complaints.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Clock className="size-6" />
              </div>
              <CardTitle className="text-lg">No Complaints Reported</CardTitle>
              <CardDescription className="max-w-sm mx-auto text-slate-400 text-sm">
                You haven't submitted any civic issue complaints yet. Tap the button above to file your first report.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((complaint) => (
              <Link key={complaint._id} to={`/complaints/${complaint._id}`}>
                <Card className="border-slate-800 hover:border-slate-700/80 bg-slate-900/50 hover:bg-slate-900/80 transition group relative overflow-hidden">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0">
                        {getCategoryIcon(complaint.category)}
                      </div>
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-slate-200 group-hover:text-teal-400 transition text-sm md:text-base line-clamp-1">
                            {complaint.title}
                          </h2>
                          <span className="hidden md:inline">
                            {getStatusBadge(complaint.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {complaint.location.address}
                        </p>
                        <div className="flex items-center gap-3 text-xxs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-slate-600" />
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                          <span className="md:hidden">•</span>
                          <span className="md:hidden">
                            {complaint.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-800/40 pt-3 md:border-none md:pt-0">
                      <div className="md:hidden">
                        {getStatusBadge(complaint.status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-teal-400 group-hover:text-teal-300 font-semibold">
                        View Details
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
