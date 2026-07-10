import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, setAuthToken } from '../lib/api.js'

export type UserRole = 'citizen' | 'officer' | 'admin'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  department?: {
    id: string
    name: string
  }
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Initialize and check memory persistence if session is active
  useEffect(() => {
    // Check if session storage has a token (safer fallback than localStorage, 
    // deleted when tab closes). We can optionally use it to avoid losing login 
    // on simple page reloads, while keeping context memory as primary.
    const savedToken = sessionStorage.getItem('cs_token')
    if (savedToken) {
      setToken(savedToken)
      setAuthToken(savedToken)
      
      // Fetch user profile
      api.get('/api/auth/me')
        .then((res) => {
          if (res.data && res.data.success) {
            setUser(res.data.user)
          } else {
            // Bad token
            logout()
          }
        })
        .catch(() => {
          logout()
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const { token: jwt, user: userProfile } = res.data
      
      setToken(jwt)
      setUser(userProfile)
      setAuthToken(jwt)
      
      // Session storage keeps session alive across tab reloads but gets wiped on close
      sessionStorage.setItem('cs_token', jwt)
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', { name, email, password })
      const { token: jwt, user: userProfile } = res.data
      
      setToken(jwt)
      setUser(userProfile)
      setAuthToken(jwt)
      
      sessionStorage.setItem('cs_token', jwt)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setAuthToken(null)
    sessionStorage.removeItem('cs_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
