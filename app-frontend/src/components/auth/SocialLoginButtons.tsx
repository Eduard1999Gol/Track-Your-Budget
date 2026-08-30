import type { LoginSuccessHandler } from '@/lib/auth/types'
import { GoogleLoginButton } from './GoogleLoginButton'
import { FacebookLoginButton } from './FacebookLoginButton'
import { GithubLoginButton } from './GithubLoginButton'

interface SocialLoginButtonsProps {
  onSuccess: LoginSuccessHandler
  onError?: (error: unknown) => void
}

/**
 * Renders every configured social login button. Add new providers by
 * dropping their button component here; each button self-disables when
 * its env var is not configured.
 */
export function SocialLoginButtons({ onSuccess, onError }: SocialLoginButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <GoogleLoginButton onSuccess={onSuccess} onError={onError} />
      <FacebookLoginButton onSuccess={onSuccess} onError={onError} />
      <GithubLoginButton onSuccess={onSuccess} onError={onError} />
    </div>
  )
}
