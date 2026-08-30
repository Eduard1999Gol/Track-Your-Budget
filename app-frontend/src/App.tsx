import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import BudgetDashboard from './Dashboard'
import Login from './Login'
import apiClient, {
  refreshAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/lib/apiClient'
import { loginWithSocialProvider } from '@/lib/auth/api'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

interface CurrentUser {
  username?: string
  email?: string
}

// Captured at module load, BEFORE React renders. Otherwise the first render
// would <Navigate> away from "/" and strip the hash from the URL before any
// effect could read it.
interface CapturedOAuth {
  accessToken: string | null
  error: string | null
}

function captureOAuthHashOnce(): CapturedOAuth {
  if (typeof window === 'undefined') return { accessToken: null, error: null }
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token')) {
    return { accessToken: null, error: null }
  }
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const accessToken = params.get('access_token')
  const error = params.get('error')
  // Strip the sensitive hash from the URL bar immediately.
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
  return { accessToken, error }
}

const capturedOAuth = captureOAuthHashOnce()

function App() {
  const { toast } = useToast()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  // True while either bootstrapping a session or exchanging a Google token.
  const [authPending, setAuthPending] = useState<boolean>(true)
  const oauthHandled = useRef(false)

  const applyAccessToken = useCallback((token: string | null) => {
    setAccessToken(token)
    setAuthToken(token)
  }, [])

  // Global handler: when apiClient can't refresh, clear session and bounce to /login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      applyAccessToken(null)
      setUserName(undefined)
    })
  }, [applyAccessToken])

  // Bootstrap: if a refresh cookie is present, silently get a fresh access token.
  // Skipped when we're about to exchange a Google token instead.
  useEffect(() => {
    if (capturedOAuth.accessToken || capturedOAuth.error) return
    let cancelled = false
    refreshAccessToken()
      .then((token) => {
        if (!cancelled) applyAccessToken(token)
      })
      .catch(() => {
        // No valid refresh cookie — user just isn't logged in yet.
      })
      .finally(() => {
        if (!cancelled) setAuthPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyAccessToken])

  // Exchange the captured Google access_token for backend tokens.
  useEffect(() => {
    if (oauthHandled.current) return
    if (!capturedOAuth.accessToken && !capturedOAuth.error) return
    oauthHandled.current = true

    if (capturedOAuth.error) {
      setAuthPending(false)
      toast({
        title: 'Google login failed',
        description: capturedOAuth.error,
        variant: 'destructive',
      })
      return
    }

    loginWithSocialProvider('google', capturedOAuth.accessToken as string)
      .then(({ accessToken }) => {
        applyAccessToken(accessToken)
      })
      .catch((err) => {
        console.error('Google login failed:', err)
        toast({
          title: 'Google login failed',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        })
      })
      .finally(() => setAuthPending(false))
  }, [applyAccessToken, toast])

  // Load the current user's display name once we have a session
  useEffect(() => {
    if (!authToken) {
      setUserName(undefined)
      return
    }
    let cancelled = false
    apiClient
      .get<CurrentUser>('/users/me/')
      .then((res) => {
        if (cancelled) return
        setUserName(res.data.username || res.data.email || undefined)
      })
      .catch(() => {
        // 401s are already handled by the apiClient interceptor
      })
    return () => {
      cancelled = true
    }
  }, [authToken])

  const handleLogout = useCallback(async () => {
    try {
      // Blacklists refresh + clears the httpOnly cookie server-side.
      await axios.post('/api/auth/logout/', {}, { withCredentials: true })
    } catch {
      // Ignore — we clear local state regardless.
    }
    applyAccessToken(null)
    setUserName(undefined)
  }, [applyAccessToken])

  const isAuthenticated = Boolean(authToken)

  if (authPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Signing you in…
      </div>
    )
  }

  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <BudgetDashboard onLogout={handleLogout} userName={userName} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  )
}

export default App


