import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import BudgetDashboard from './Dashboard'
import Login from './Login'
import apiClient, { setUnauthorizedHandler } from '@/lib/apiClient'
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
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token'),
  )
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [oauthPending, setOauthPending] = useState<boolean>(
    () => Boolean(capturedOAuth.accessToken),
  )
  const oauthHandled = useRef(false)

  // Global handler: when apiClient can't refresh, clear session and bounce to /login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      setAuthToken(null)
      setUserName(undefined)
    })
  }, [])

  // Exchange the captured Google access_token for backend JWTs.
  useEffect(() => {
    if (oauthHandled.current) return
    oauthHandled.current = true

    if (capturedOAuth.error) {
      setOauthPending(false)
      toast({
        title: 'Google login failed',
        description: capturedOAuth.error,
        variant: 'destructive',
      })
      return
    }

    if (!capturedOAuth.accessToken) return

    loginWithSocialProvider('google', capturedOAuth.accessToken)
      .then(({ accessToken, refreshToken }) => {
        localStorage.setItem('auth_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        setAuthToken(accessToken)
      })
      .catch((err) => {
        console.error('Google login failed:', err)
        toast({
          title: 'Google login failed',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        })
      })
      .finally(() => setOauthPending(false))
  }, [toast])

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

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    setAuthToken(null)
    setUserName(undefined)
  }, [])

  const isAuthenticated = Boolean(authToken)

  // Don't route while we're still exchanging the Google token, otherwise the
  // "/" route would flash a redirect to /login.
  if (oauthPending) {
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


