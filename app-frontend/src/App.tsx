import { useState, useEffect, useCallback } from 'react'
import BudgetDashboard from './Dashboard'
import Login from './Login'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { setUnauthorizedHandler } from '@/lib/apiClient'
import type { AuthResult } from '@/lib/auth/types'

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )
  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem('user_name') ?? ''
  )
  const { toast } = useToast()

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_name')
    setToken(null)
    setUserName('')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast({
        title: 'Sitzung abgelaufen',
        description: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
        variant: 'destructive',
      })
      handleLogout()
    })
  }, [toast, handleLogout])

  const handleLoginSuccess = ({ accessToken, refreshToken, userName }: AuthResult) => {
    localStorage.setItem('auth_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user_name', userName)
    setToken(accessToken)
    setUserName(userName)
  }

  return (
    <>
      {token ? (
        <BudgetDashboard onLogout={handleLogout} userName={userName} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      <Toaster />
    </>
  )
}

export default App
