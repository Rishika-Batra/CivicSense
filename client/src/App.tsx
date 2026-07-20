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
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/4 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-slate-950 -z-10" />

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <header className="cs-page-header">
          <div>
            <div className="cs-section-badge border-teal-500/20 bg-teal-500/10 text-teal-400">
              Role: {user?.role?.toUpperCase()}
            </div>
            <h1 className="cs-page-title">
              Welcome back, {user?.name}!
            </h1>
            <p className="cs-page-subtitle">{user?.email}</p>
          </div>
          <Button
            onClick={logout}
            className="cs-btn-secondary text-xs px-4 py-2 h-auto self-start md:self-end"
          >
            Sign Out
          </Button>
        </header>

        {/* ── Quick Actions Grid ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.role === 'citizen' ? (
              <button
                onClick={() => navigate('/report')}
                className="cs-card p-5 text-left hover:border-teal-500/40 hover:bg-slate-800/50 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
                  <span className="text-slate-950 text-xl">📋</span>
                </div>
                <h3 className="font-bold text-slate-200 group-hover:text-teal-400 transition">Report a New Issue</h3>
                <p className="text-xs text-slate-500 mt-1">File a civic complaint with photo proof and location pinning.</p>
              </button>
            ) : (
              <button
                onClick={() => navigate('/officer')}
                className="cs-card p-5 text-left hover:border-teal-500/40 hover:bg-slate-800/50 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
                  <span className="text-slate-950 text-xl">🛡️</span>
                </div>
                <h3 className="font-bold text-slate-200 group-hover:text-teal-400 transition">Officer Dashboard</h3>
                <p className="text-xs text-slate-500 mt-1">View and action assigned complaints in your workload console.</p>
              </button>
            )}

            <button
              onClick={() => navigate(user?.role === 'citizen' ? '/my-complaints' : '/officer')}
              className="cs-card p-5 text-left hover:border-slate-700 hover:bg-slate-800/50 transition-all group"
            >
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mb-3">
                <span className="text-xl">📂</span>
              </div>
              <h3 className="font-bold text-slate-200 group-hover:text-slate-100 transition">
                {user?.role === 'citizen' ? 'My Reported Issues' : 'Assigned Console'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {user?.role === 'citizen' ? 'Track status and resolution of your filed complaints.' : 'Manage and update your assigned complaint queue.'}
              </p>
            </button>

            <button
              onClick={() => navigate('/map')}
              className="cs-card p-5 text-left hover:border-slate-700 hover:bg-slate-800/50 transition-all group"
            >
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mb-3">
                <span className="text-xl">🗺️</span>
              </div>
              <h3 className="font-bold text-slate-200 group-hover:text-slate-100 transition">City Map View</h3>
              <p className="text-xs text-slate-500 mt-1">Explore all civic complaints plotted on an interactive city map.</p>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="cs-card p-5 text-left hover:border-purple-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-xl">⚙️</span>
                </div>
                <h3 className="font-bold text-purple-300 group-hover:text-purple-200 transition">Admin Console</h3>
                <p className="text-xs text-slate-500 mt-1">Manage users, departments, and complaint assignments.</p>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/analytics')}
                className="cs-card p-5 text-left hover:border-violet-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-xl">📊</span>
                </div>
                <h3 className="font-bold text-violet-300 group-hover:text-violet-200 transition">Analytics Dashboard</h3>
                <p className="text-xs text-slate-500 mt-1">Real-time platform intelligence across all complaint data.</p>
              </button>
            )}
          </div>
        </section>

        {/* ── Service Status ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
            Service Status Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Server Checker */}
            <div className="cs-card p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-slate-200">Express Server</h3>
                <p className="text-xs text-slate-500">Port 5000 — Node.js REST API</p>
              </div>
              <div className="text-xs font-mono py-2 px-3 bg-slate-950/80 rounded-lg border border-slate-800 text-teal-300 min-h-[2.5rem] flex items-center break-all">
                {serverStatus || <span className="text-slate-600 italic">Not tested yet</span>}
              </div>
              <Button
                onClick={checkServer}
                disabled={checkingServer}
                className="cs-btn-primary w-full py-2"
              >
                {checkingServer ? 'Checking...' : 'Check Server Connection'}
              </Button>
            </div>

            {/* AI Service Checker */}
            <div className="cs-card p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-slate-200">AI Service (FastAPI)</h3>
                <p className="text-xs text-slate-500">Port 8000 — YOLOv8 Inference</p>
              </div>
              <div className="text-xs font-mono py-2 px-3 bg-slate-950/80 rounded-lg border border-slate-800 text-teal-300 min-h-[2.5rem] flex items-center break-all">
                {aiStatus || <span className="text-slate-600 italic">Not tested yet</span>}
              </div>
              <Button
                onClick={checkAiService}
                disabled={checkingAi}
                className="cs-btn-primary w-full py-2"
              >
                {checkingAi ? 'Checking...' : 'Check AI Connection'}
              </Button>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-600 border-t border-slate-800/60 pt-6 pb-2">
          CivicSense • Secure Session Managed in Context Memory
        </footer>
      </div>
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
