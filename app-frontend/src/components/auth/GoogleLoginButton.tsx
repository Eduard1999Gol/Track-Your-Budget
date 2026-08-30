import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { loginWithSocialProvider } from '@/lib/auth/api'
import type { LoginSuccessHandler } from '@/lib/auth/types'

interface GoogleLoginButtonProps {
  onSuccess: LoginSuccessHandler
  onError?: (error: unknown) => void
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null
  }

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('Missing Google credential')
      }
      const result = await loginWithSocialProvider('google', credentialResponse.credential)
      onSuccess(result)
    } catch (error) {
      console.error('Google login failed:', error)
      onError?.(error)
    }
  }

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => onError?.(new Error('Google Login Failed'))}
      useOneTap
    />
  )
}
