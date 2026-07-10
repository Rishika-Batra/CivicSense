import React, { useEffect, useState } from 'react'
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react'

// ─── Types & Pub/Sub Singleton ───────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

type ToastListener = (toast: ToastItem) => void

class ToastService {
  private listeners = new Set<ToastListener>()

  subscribe(listener: ToastListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastItem = { id, message, type, duration }
    this.listeners.forEach((listener) => listener(toast))
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration)
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration)
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration)
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration)
  }
}

export const toast = new ToastService()

// ─── Toast Component ─────────────────────────────────────────────────────────

interface ToastCardProps {
  item: ToastItem
  onClose: (id: string) => void
}

const ToastCard: React.FC<ToastCardProps> = ({ item, onClose }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay to trigger enter transition
    const enterTimeout = setTimeout(() => setVisible(true), 50)

    // Setup close timeout
    const closeTimeout = setTimeout(() => {
      setVisible(false)
      // Allow exit animation to play before cleanup
      setTimeout(() => onClose(item.id), 300)
    }, item.duration)

    return () => {
      clearTimeout(enterTimeout)
      clearTimeout(closeTimeout)
    }
  }, [item, onClose])

  const handleManualClose = () => {
    setVisible(false)
    setTimeout(() => onClose(item.id), 300)
  }

  // Styles map based on severity type
  const typeMap = {
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/70',
      glow: 'shadow-emerald-950/30',
      text: 'text-emerald-400',
      icon: <CheckCircle className="size-4 shrink-0" />,
    },
    error: {
      border: 'border-red-500/30',
      bg: 'bg-red-950/70',
      glow: 'shadow-red-950/30',
      text: 'text-red-400',
      icon: <AlertCircle className="size-4 shrink-0" />,
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/70',
      glow: 'shadow-amber-950/30',
      text: 'text-amber-400',
      icon: <AlertTriangle className="size-4 shrink-0" />,
    },
    info: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-950/70',
      glow: 'shadow-blue-950/30',
      text: 'text-blue-400',
      icon: <Info className="size-4 shrink-0" />,
    },
  }

  const current = typeMap[item.type] ?? typeMap.info

  return (
    <div
      className={`max-w-sm w-full border ${current.border} ${current.bg} ${current.glow} backdrop-blur-md shadow-lg rounded-xl p-4 flex items-start gap-3 transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'
      }`}
    >
      <div className={current.text}>{current.icon}</div>
      <div className="flex-1 text-xs font-semibold text-slate-200 leading-normal pr-2">
        {item.message}
      </div>
      <button
        onClick={handleManualClose}
        className="p-0.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ─── Toast Container ──────────────────────────────────────────────────────────

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast])
    })
    return unsubscribe
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  )
}
