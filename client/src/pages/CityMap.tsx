import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import {
  MapIcon,
  SlidersHorizontal,
  RefreshCw,
  X,
  ArrowLeft,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplaintMapData {
  _id: string
  title: string
  category: string
  status: 'Pending' | 'InProgress' | 'Resolved'
  priority: string
  location: { latitude: number; longitude: number; address: string }
  createdAt: string
}

// ─── Color Constants ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Pending: {
    color: '#f59e0b',
    glow: '#f59e0b55',
    label: 'Pending',
    ring: '#fbbf24',
  },
  InProgress: {
    color: '#3b82f6',
    glow: '#3b82f655',
    label: 'In Progress',
    ring: '#60a5fa',
  },
  Resolved: {
    color: '#10b981',
    glow: '#10b98155',
    label: 'Resolved',
    ring: '#34d399',
  },
}

const CATEGORY_EMOJI: Record<string, string> = {
  Pothole: '🚧',
  Garbage: '🗑️',
  BrokenStreetlight: '💡',
  Waterlogging: '💧',
  FallenTree: '🌳',
  Other: '⚠️',
}

const CATEGORIES = ['Pothole', 'Garbage', 'BrokenStreetlight', 'Waterlogging', 'FallenTree', 'Other']

// ─── Custom Marker Icon Factory ───────────────────────────────────────────────

function createMarkerIcon(status: keyof typeof STATUS_CONFIG): L.DivIcon {
  const cfg = STATUS_CONFIG[status]
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${cfg.glow};
          animation: pulse-ring 2s ease-out infinite;
        "></div>
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${cfg.color};
          border: 2.5px solid ${cfg.ring};
          box-shadow: 0 0 8px ${cfg.glow}, 0 2px 4px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1;
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

// ─── Popup HTML Factory ────────────────────────────────────────────────────────

function buildPopupHtml(c: ComplaintMapData, isAdmin: boolean): string {
  const cfg = STATUS_CONFIG[c.status]
  const emoji = CATEGORY_EMOJI[c.category] ?? '⚠️'
  const date = new Date(c.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const detailPath = isAdmin ? `/complaints/${c._id}` : `/complaints/${c._id}`

  return `
    <div style="
      font-family: 'Geist Variable', system-ui, sans-serif;
      min-width: 220px;
      max-width: 280px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      color: #e2e8f0;
    ">
      <div style="padding: 14px 16px 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 20px; line-height: 1; flex-shrink: 0; margin-top: 2px;">${emoji}</span>
          <div style="min-width: 0;">
            <h3 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; line-height: 1.3; color: #f1f5f9; word-break: break-word;">
              ${c.title}
            </h3>
            <p style="margin: 0; font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${c.location.address}
            </p>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
          <span style="
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
            background: ${cfg.color}22; color: ${cfg.color}; border: 1px solid ${cfg.color}44;
          ">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${cfg.color}; display: inline-block;"></span>
            ${cfg.label}
          </span>
          <span style="
            padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
            background: #1e293b; color: #94a3b8; border: 1px solid #334155;
          ">
            ${c.category === 'BrokenStreetlight' ? 'Streetlight' : c.category}
          </span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #1e293b;">
          <span style="font-size: 10px; color: #475569;">${date}</span>
          <a
            href="${detailPath}"
            style="
              font-size: 11px; font-weight: 600; color: #2dd4bf;
              text-decoration: none; display: flex; align-items: center; gap: 3px;
            "
            onclick="window.__navigateTo && window.__navigateTo('${detailPath}'); return false;"
          >
            View details →
          </a>
        </div>
      </div>
    </div>
  `
}

// ─── City Map Page ─────────────────────────────────────────────────────────────

export const CityMap: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  const [allComplaints, setAllComplaints] = useState<ComplaintMapData[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  const isAdmin = user?.role === 'admin'
  const isOfficer = user?.role === 'officer'

  // ── Fetch complaints ──────────────────────────────────────────────────────────

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let res
      if (isAdmin) {
        res = await api.get('/api/admin/complaints', { params: { limit: 500 } })
      } else if (isOfficer) {
        res = await api.get('/api/complaints', { params: { limit: 500 } })
      } else {
        // Citizens see their own complaints on the map
        res = await api.get('/api/complaints/my')
      }
      const raw = res.data.complaints ?? res.data.complaints ?? []
      setAllComplaints(raw.filter((c: ComplaintMapData) =>
        typeof c.location?.latitude === 'number' &&
        typeof c.location?.longitude === 'number'
      ))
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to fetch complaint data.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isOfficer])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  // ── Expose navigate to popup links ────────────────────────────────────────────

  useEffect(() => {
    // Attach navigate to window so popup href onclick can call it
    ;(window as any).__navigateTo = (path: string) => navigate(path)
    return () => {
      delete (window as any).__navigateTo
    }
  }, [navigate])

  // ── Initialise Leaflet map ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // India centroid fallback
      zoom: 12,
      zoomControl: false,
    })

    // Custom styled OSM dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Place zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const markersLayer = L.layerGroup().addTo(map)
    markersLayerRef.current = markersLayer
    mapRef.current = map

    // Inject pulse animation CSS into document head
    if (!document.getElementById('cs-marker-pulse')) {
      const style = document.createElement('style')
      style.id = 'cs-marker-pulse'
      style.innerHTML = `
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Apply filters and re-render markers ───────────────────────────────────────

  const filteredComplaints = allComplaints.filter((c) => {
    if (filterCategory !== 'All' && c.category !== filterCategory) return false
    if (filterStatus !== 'All' && c.status !== filterStatus) return false
    if (filterDateFrom) {
      const from = new Date(filterDateFrom)
      if (new Date(c.createdAt) < from) return false
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo)
      to.setHours(23, 59, 59, 999)
      if (new Date(c.createdAt) > to) return false
    }
    return true
  })

  useEffect(() => {
    const layer = markersLayerRef.current
    const map = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()

    if (filteredComplaints.length === 0) return

    const bounds: [number, number][] = []

    filteredComplaints.forEach((c) => {
      const { latitude, longitude } = c.location
      const icon = createMarkerIcon(c.status)
      const marker = L.marker([latitude, longitude], { icon })

      marker.bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 220,
          className: 'cs-popup',
          closeButton: true,
        }).setContent(buildPopupHtml(c, isAdmin || isOfficer))
      )

      layer.addLayer(marker)
      bounds.push([latitude, longitude])
    })

    // Fit map to markers if we have data
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 })
    }
  }, [filteredComplaints, isAdmin, isOfficer])

  // ── Count by status for the sidebar stats ─────────────────────────────────────

  const countByStatus = {
    Pending: filteredComplaints.filter((c) => c.status === 'Pending').length,
    InProgress: filteredComplaints.filter((c) => c.status === 'InProgress').length,
    Resolved: filteredComplaints.filter((c) => c.status === 'Resolved').length,
  }

  const resetFilters = () => {
    setFilterCategory('All')
    setFilterStatus('All')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const hasActiveFilters =
    filterCategory !== 'All' || filterStatus !== 'All' || filterDateFrom || filterDateTo

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Popup CSS overrides — dark theme */}
      <style>{`
        .cs-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 12px;
          overflow: hidden;
        }
        .cs-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .cs-popup .leaflet-popup-tip-container { display: none; }
        .cs-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 10px !important;
          z-index: 100;
        }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #94a3b8 !important;
          border: 1px solid #334155 !important;
        }
        .leaflet-control-zoom a:hover { background: #334155 !important; color: #e2e8f0 !important; }
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.8) !important;
          color: #475569 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #64748b !important; }
      `}</style>

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside
        className={`relative z-20 flex flex-col bg-slate-900/95 border-r border-slate-800 transition-all duration-300 overflow-hidden ${
          sidebarOpen ? 'w-72 min-w-[288px]' : 'w-0 min-w-0'
        }`}
      >
        <div className="flex flex-col h-full min-w-[288px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Go back"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h1 className="text-sm font-extrabold text-slate-200 tracking-tight leading-tight">
                  City Map View
                </h1>
                <p className="text-xxs text-slate-500">
                  {loading ? 'Loading…' : `${filteredComplaints.length} complaint${filteredComplaints.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button
              onClick={fetchComplaints}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Status Summary Chips */}
          <div className="p-4 border-b border-slate-800/60 grid grid-cols-3 gap-2 shrink-0">
            {(Object.entries(countByStatus) as [keyof typeof STATUS_CONFIG, number][]).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(filterStatus === status ? 'All' : status)}
                  style={{
                    borderColor: filterStatus === status ? cfg.color + '80' : '#1e293b',
                    background: filterStatus === status ? cfg.color + '15' : 'transparent',
                  }}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-center transition-all"
                >
                  <span className="text-lg font-extrabold text-slate-100">{count}</span>
                  <span style={{ color: cfg.color }} className="text-xxs font-semibold">
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filters */}
          <div className="p-4 flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5" />
                Filters
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xxs text-slate-500 hover:text-slate-300 transition flex items-center gap-1"
                >
                  <X className="size-3" /> Clear
                </button>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xxs uppercase tracking-wider text-slate-500">
                Category
              </Label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-teal-500/50 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_EMOJI[c]} {c === 'BrokenStreetlight' ? 'Broken Streetlight' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xxs uppercase tracking-wider text-slate-500">
                Status
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {(['All', 'Pending', 'InProgress', 'Resolved'] as const).map((s) => {
                  const cfg = s !== 'All' ? STATUS_CONFIG[s] : null
                  const active = filterStatus === s
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      style={
                        active && cfg
                          ? { borderColor: cfg.color + '60', background: cfg.color + '12', color: cfg.color }
                          : {}
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? 'border-current'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {cfg && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: active ? cfg.color : '#475569' }}
                        />
                      )}
                      {s === 'All' ? 'All Statuses' : s === 'InProgress' ? 'In Progress' : s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xxs uppercase tracking-wider text-slate-500">
                Date Range
              </Label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-xxs text-slate-600">From</span>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xxs text-slate-600">To</span>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-slate-800/60 space-y-2 shrink-0">
            <p className="text-xxs uppercase tracking-wider text-slate-600 font-semibold">Legend</p>
            <div className="space-y-1.5">
              {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="relative w-4 h-4 shrink-0 flex items-center justify-center">
                    <span
                      className="absolute inset-0 rounded-full opacity-30"
                      style={{ background: cfg.color }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border"
                      style={{ background: cfg.color, borderColor: cfg.ring }}
                    />
                  </span>
                  {cfg.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Map Area ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold shadow-lg backdrop-blur-sm transition"
        >
          <MapIcon className="size-3.5" />
          {sidebarOpen ? 'Hide' : 'Filters'}
        </button>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            <p className="text-sm text-teal-400 font-medium tracking-wide">Loading city data…</p>
          </div>
        )}

        {/* Error state */}
        {errorMsg && !loading && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
            <p className="text-red-400 font-medium text-sm">{errorMsg}</p>
            <Button onClick={fetchComplaints} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <RefreshCw className="size-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        )}

        {/* Empty state overlay */}
        {!loading && !errorMsg && filteredComplaints.length === 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-5 py-3 bg-slate-900/90 border border-slate-700 rounded-2xl text-sm text-slate-400 flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <Circle className="size-4 text-slate-600" />
            No complaints match the current filters
          </div>
        )}

        {/* Complaint count badge */}
        {!loading && filteredComplaints.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-slate-900/90 border border-slate-700 rounded-2xl text-xs text-slate-300 flex items-center gap-3 shadow-lg backdrop-blur-sm">
            {(Object.entries(countByStatus) as [string, number][]).map(([status, count]) => {
              if (count === 0) return null
              const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
              return (
                <span key={status} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <span style={{ color: cfg.color }} className="font-semibold">{count}</span>
                  <span className="text-slate-500">{cfg.label}</span>
                </span>
              )
            })}
          </div>
        )}

        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
