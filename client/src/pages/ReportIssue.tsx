import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import L from 'leaflet'
import {
  Upload,
  MapPin,
  FileText,
  Sparkles,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

// Resolve Vite asset loading path issue for Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const categories = [
  'Pothole',
  'Garbage',
  'BrokenStreetlight',
  'Waterlogging',
  'FallenTree',
  'Other',
]

const priorities = ['Low', 'Medium', 'High', 'Critical']

const reportFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  category: z.string().min(1, 'Category is required'),
  priority: z.string().min(1, 'Priority is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(5, 'Address details are required'),
})

type ReportFormValues = z.infer<typeof reportFormSchema>

export const ReportIssue: React.FC = () => {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerInstance = useRef<L.Marker | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: string
    confidence: number
  } | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<{
    id: string
    status: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Other',
      priority: 'Medium',
      latitude: 28.6139, // Default to New Delhi coordinates
      longitude: 77.2090,
      address: 'Fetching pin location address...',
    },
  })

  const formLat = watch('latitude')
  const formLng = watch('longitude')
  const formAddress = watch('address')

  // Reverse Geocoding via Nominatim API
  const updateAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'User-Agent': 'CivicSense-App',
          },
        }
      )
      const data = await res.json()
      if (data && data.display_name) {
        setValue('address', data.display_name)
      } else {
        setValue('address', `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } catch (err) {
      console.error(err)
      setValue('address', `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
  }

  // Initialize Leaflet Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const defaultCenter: [number, number] = [28.6139, 77.2090]

      const map = L.map(mapRef.current).setView(defaultCenter, 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const marker = L.marker(defaultCenter, { draggable: true }).addTo(map)

      mapInstance.current = map
      markerInstance.current = marker

      setValue('latitude', defaultCenter[0])
      setValue('longitude', defaultCenter[1])
      updateAddress(defaultCenter[0], defaultCenter[1])

      // Sync marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng()
        setValue('latitude', position.lat)
        setValue('longitude', position.lng)
        updateAddress(position.lat, position.lng)
      })

      // Sync map click
      map.on('click', (e) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setValue('latitude', lat)
        setValue('longitude', lng)
        updateAddress(lat, lng)
      })
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        markerInstance.current = null
      }
    }
  }, [])

  // Process selected image and query prediction
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setAiSuggestion(null)

    // Call predict category endpoint
    setIsAnalyzing(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await api.post('/api/complaints/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (res.data && res.data.success) {
        const { category, confidence } = res.data
        setAiSuggestion({ category, confidence })
        setValue('category', category) // Auto-select AI category suggestion
      }
    } catch (err) {
      console.warn('AI prediction failed, falling back to manual review override.', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onSubmit = async (data: ReportFormValues) => {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('description', data.description)
    formData.append('category', data.category)
    formData.append('priority', data.priority)
    formData.append('latitude', data.latitude.toString())
    formData.append('longitude', data.longitude.toString())
    formData.append('address', data.address)

    if (imageFile) {
      formData.append('image', imageFile)
    }

    try {
      const res = await api.post('/api/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (res.data && res.data.success) {
        setSubmitSuccess({
          id: res.data.complaint._id,
          status: res.data.complaint.status,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/60 backdrop-blur-lg shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="size-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-extrabold text-slate-100">
              Complaint Registered!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Thank you for contributing to civic improvement.
            </CardDescription>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-left space-y-2 font-mono text-xs">
            <div>
              <span className="text-slate-500">Complaint ID:</span>{' '}
              <span className="text-teal-300 font-bold">{submitSuccess.id}</span>
            </div>
            <div>
              <span className="text-slate-500">Initial Status:</span>{' '}
              <span className="text-emerald-400 font-bold">{submitSuccess.status}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Go to Home
            </Button>
            <Button
              onClick={() => {
                setSubmitSuccess(null)
                setImageFile(null)
                setImagePreview(null)
                setAiSuggestion(null)
              }}
              className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold"
            >
              Report Another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      <Card className="max-w-4xl w-full border-slate-800 bg-slate-900/60 backdrop-blur-lg shadow-2xl relative">
        <CardHeader className="border-b border-slate-800/60 pb-6 flex flex-row items-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-slate-400 hover:text-white p-2 h-auto"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Report Civic Issue
            </CardTitle>
            <CardDescription className="text-slate-400">
              Pin the location, upload proof, and report urban issues.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side: Upload and Map */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-slate-300">Issue Photo Proof</Label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-6 bg-slate-950/40 relative">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-800">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          setAiSuggestion(null)
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 text-xs font-semibold shadow-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 cursor-pointer py-6 w-full">
                      <div className="w-10 h-10 bg-slate-800 text-teal-400 rounded-full flex items-center justify-center">
                        <Upload className="size-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-300">Click to Upload Image</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* AI Suggestion Box */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                      <p className="text-xs text-teal-400 font-medium">Running YOLOv8 Classifiers...</p>
                    </div>
                  )}

                  {aiSuggestion && (
                    <div className="w-full mt-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-teal-400">
                        <Sparkles className="size-4 shrink-0" />
                        <span className="text-xs font-medium">
                          AI Suggestion: <strong className="underline">{aiSuggestion.category}</strong>
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full">
                        {Math.round(aiSuggestion.confidence * 100)}% Match
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Leaflet Map Pinning */}
              <div className="space-y-2">
                <Label className="text-slate-300">Pin Incident Location</Label>
                <div
                  ref={mapRef}
                  className="w-full h-64 rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60 shadow-inner z-0"
                />
                <div className="flex items-start gap-2 text-xs text-slate-400 mt-2 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
                  <MapPin className="size-4 text-teal-400 shrink-0 mt-0.5" />
                  <span className="break-words line-clamp-2">
                    <strong>Address:</strong> {formAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Input Fields */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-300">
                    Complaint Title
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                    <Input
                      id="title"
                      placeholder="e.g. Broken streetlight on 5th avenue"
                      className="pl-10 bg-slate-950/50 border-slate-800 focus:border-teal-500/60 text-slate-100"
                      {...register('title')}
                    />
                  </div>
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300">
                    Description Details
                  </Label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Provide description regarding the incident to help city officers..."
                    className="w-full rounded-md border border-slate-800 bg-slate-950/50 p-3 text-sm focus:border-teal-500/60 focus:outline-none text-slate-100 placeholder:text-slate-500"
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                  )}
                </div>

                {/* Category Selection with AI override */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-300">
                      Category
                    </Label>
                    <select
                      id="category"
                      className="w-full rounded-md border border-slate-800 bg-slate-950/50 p-2.5 text-sm focus:border-teal-500/60 focus:outline-none text-slate-100"
                      {...register('category')}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-950">
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-xs text-destructive mt-1">{errors.category.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-slate-300">
                      Priority Rating
                    </Label>
                    <select
                      id="priority"
                      className="w-full rounded-md border border-slate-800 bg-slate-950/50 p-2.5 text-sm focus:border-teal-500/60 focus:outline-none text-slate-100"
                      {...register('priority')}
                    >
                      {priorities.map((prio) => (
                        <option key={prio} value={prio} className="bg-slate-950">
                          {prio}
                        </option>
                      ))}
                    </select>
                    {errors.priority && (
                      <p className="text-xs text-destructive mt-1">{errors.priority.message}</p>
                    )}
                  </div>
                </div>

                {/* Draggable coordinate readouts */}
                <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 font-mono text-xxs text-slate-500">
                  <div>
                    Latitude: <span className="text-slate-300">{formLat.toFixed(6)}</span>
                  </div>
                  <div>
                    Longitude: <span className="text-slate-300">{formLng.toFixed(6)}</span>
                  </div>
                </div>
              </div>

              {/* Form Submission */}
              <div className="pt-4 flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1 border-slate-800 hover:bg-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-teal-900/20"
                >
                  {isSubmitting ? 'Registering...' : 'File Report'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
