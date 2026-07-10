import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext.js'

interface ProtectedRouteProps {
  redirectPath?: string
}

/**
 * Route wrapper that enforces authentication.
 * Redirects unauthenticated users to login path.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectPath = '/login',
}) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-teal-400 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading secure session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}

interface RoleGuardProps {
  allowedRoles: UserRole[]
  fallbackPath?: string
}

/**
 * Route guard that enforces role-based access control.
 * Must be nested inside a ProtectedRoute.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  fallbackPath = '/',
}) => {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <Outlet />
}
