import { useState } from 'react'
import BudgetDashboard from './Dashboard'
import Login from './Login'

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )
  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem('user_name') ?? ''
  )

  const handleLoginSuccess = (newToken: string, newUserName: string) => {
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('user_name', newUserName)
    setToken(newToken)
    setUserName(newUserName)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_name')
    setToken(null)
    setUserName('')
  }

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return <BudgetDashboard onLogout={handleLogout} userName={userName} />
}

export default App
