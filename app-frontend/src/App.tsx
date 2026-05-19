import { useState } from 'react'
import BudgetDashboard from './Dashboard'
import Login from './Login'

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('auth_token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
  }

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return <BudgetDashboard onLogout={handleLogout} />
}

export default App
