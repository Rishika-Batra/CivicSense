import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.js'
import { ProtectedRoute, RoleGuard } from './components/RouteGuards.js'
import { Login } from './pages/Login.js'
import { Register } from './pages/Register.js'
import { ReportIssue } from './pages/ReportIssue.js'
import { MyComplaints } from './pages/MyComplaints.js'
import { ComplaintDetail } from './pages/ComplaintDetail.js'
import { OfficerDashboard } from './pages/OfficerDashboard.js'
import { AdminDashboard } from './pages/AdminDashboard.js'
import { Analytics } from './pages/Analytics.js'
import { CityMap } from './pages/CityMap.js'
import { ToastContainer } from './components/Toast.js'
import { Button } from './components/ui/button.js'
import { api } from './lib/api.js'

function Home() {
  const { user, logout } = useAuth()
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const [checkingServer, setCheckingServer] = useState(false)
  const [checkingAi, setCheckingAi] = useState(false)
  const navigate = useNavigate()

  const checkServer = async () => {
    setCheckingServer(true)
    try {
      const res = await api.get('/')
      setServerStatus(res.data.message || JSON.stringify(res.data))
    } catch {
      setServerStatus('Failed to connect to Server on port 5000')
    } finally {
      setCheckingServer(false)
    }
  }

  const checkAiService = async () => {
    setCheckingAi(true)
    try {
      const res = await api.get('http://localhost:8000/')
      setAiStatus(res.data.message || JSON.stringify(res.data))
    } catch {
      setAiStatus('Failed to connect to AI Service on port 8000')
    } finally {
      setCheckingAi(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 -z-10" />

      <main className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <header className="flex justify-between items-start border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Role: {user?.role}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Welcome, {user?.name}!
            </h1>
            <p className="text-sm text-slate-400 mt-1">{user?.email}</p>
          </div>
          <Button onClick={logout} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 h-auto">
            Sign Out
          </Button>
        </header>

        <section className="space-y-6">
          <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-xl">
            <h2 className="text-lg font-semibold text-teal-400 mb-2">Service Status Indicators</h2>
            <p className="text-sm text-slate-400 mb-4">
              Validate local api servers using Axios instance interceptors.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Server Checker */}
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-slate-200">Express Server</h3>
                  <p className="text-xs text-slate-400">Port 5000</p>
                  <div className="mt-3 text-xs font-mono py-1.5 px-2 bg-slate-950 rounded text-teal-300 min-h-[2rem] flex items-center break-all">
                    {serverStatus || 'Not tested yet'}
                  </div>
                </div>
                <Button
                  onClick={checkServer}
                  disabled={checkingServer}
                  className="mt-4 bg-teal-600 text-white hover:bg-teal-500 w-full"
                >
                  {checkingServer ? 'Checking...' : 'Check Server Connection'}
                </Button>
              </div>

              {/* AI Service Checker */}
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-slate-200">AI Service (FastAPI)</h3>
                  <p className="text-xs text-slate-400">Port 8000</p>
                  <div className="mt-3 text-xs font-mono py-1.5 px-2 bg-slate-950 rounded text-teal-300 min-h-[2rem] flex items-center break-all">
                    {aiStatus || 'Not tested yet'}
                  </div>
                </div>
                <Button
                  onClick={checkAiService}
                  disabled={checkingAi}
                  className="mt-4 bg-teal-600 text-white hover:bg-teal-500 w-full"
                >
                  {checkingAi ? 'Checking...' : 'Check AI Connection'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {user?.role === 'citizen' ? (
              <Button
                onClick={() => navigate('/report')}
                className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-teal-900/20"
              >
                Report a New Issue
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/officer')}
                className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-teal-900/20"
              >
                Go to Officer Dashboard
              </Button>
            )}
            <Button
              onClick={() => navigate(user?.role === 'citizen' ? '/my-complaints' : '/officer')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            >
              {user?.role === 'citizen' ? 'My Reported Issues' : 'Assigned Console'}
            </Button>
            <Button
              onClick={() => navigate('/map')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            >
              🗺️ City Map
            </Button>
          </div>
          <div className="flex gap-4">
            {user?.role === 'admin' && (
              <Button
                onClick={() => navigate('/admin')}
                className="flex-1 bg-slate-900 border border-purple-800/40 hover:bg-slate-800 text-purple-400 text-xs py-1.5 h-auto"
              >
                Admin Console
              </Button>
            )}
            {user?.role === 'admin' && (
              <Button
                onClick={() => navigate('/analytics')}
                className="flex-1 bg-slate-900 border border-violet-800/40 hover:bg-slate-800 text-violet-400 text-xs py-1.5 h-auto"
              >
                Analytics Dashboard
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 border-t border-slate-800/60 pt-6">
            CivicSense • Secure Session Managed in Context Memory
          </div>
        </section>
      </main>
    </div>
  )
}


function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/my-complaints" element={<MyComplaints />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        
        {/* Officer only dashboard */}
        <Route element={<RoleGuard allowedRoles={['officer', 'admin']} fallbackPath="/" />}>
          <Route path="/officer" element={<OfficerDashboard />} />
        </Route>

        {/* City map — all authenticated users */}
        <Route path="/map" element={<CityMap />} />

        {/* Admin only routes */}
        <Route element={<RoleGuard allowedRoles={['admin']} fallbackPath="/" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <ToastContainer />
      </AuthProvider>
    </Router>
  )
}
