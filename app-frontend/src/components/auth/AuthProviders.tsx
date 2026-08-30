import { GoogleOAuthProvider } from '@react-oauth/google'
import type { ReactNode } from 'react'

/**
 * Composes third-party auth SDK providers around the app.
 * Add new SDK providers (e.g. Facebook SDK) here as they are introduced.
 */
interface AuthProvidersProps {
  children: ReactNode
}

export function AuthProviders({ children }: AuthProvidersProps) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  let tree = <>{children}</>

  if (googleClientId) {
    tree = <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
  }

  return tree
}
