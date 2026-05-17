import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LayoutDashboard } from 'lucide-react'

interface LoginProps {
  onLoginSuccess: (token: string) => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const response = await fetch('/api/auth/google/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: credentialResponse.credential, id_token: credentialResponse.credential }),
      })

      const responseText = await response.text()
      console.log('Backend response:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse response as JSON. Response was:', responseText)
        return
      }

      if (response.ok) {
        const token = data.key || data.access_token
        console.log('Logged in successfully! Backend Token:', token)
        onLoginSuccess(token)
      } else {
        console.error('Backend login failed', data)
      }
    } catch (error) {
      console.error('Network error connecting to Django:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 mb-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Budget Dashboard</CardTitle>
          <CardDescription>
            Sign in with your Google account to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.log('Google Login Failed')}
            useOneTap
          />
        </CardContent>
      </Card>
    </div>
  )
}
