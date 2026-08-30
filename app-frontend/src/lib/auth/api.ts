import type {
  AuthResult,
  BackendAuthResponse,
  SocialProvider,
} from './types'

/**
 * Exchanges a provider-issued OAuth access token for a backend access token.
 * The refresh token is delivered by the backend as an httpOnly cookie, so we
 * MUST send credentials to receive/keep it.
 * Backend contract (dj-rest-auth SocialLoginView): POST /api/{provider}/login/  { access_token }
 */
export async function loginWithSocialProvider(
  provider: SocialProvider,
  providerToken: string,
): Promise<AuthResult> {
  const response = await fetch(`/api/${provider}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ access_token: providerToken }),
  })

  const responseText = await response.text()
  let data: BackendAuthResponse
  try {
    data = JSON.parse(responseText) as BackendAuthResponse
  } catch {
    throw new Error(`Invalid JSON from ${provider} auth endpoint: ${responseText}`)
  }

  if (!response.ok) {
    throw new Error(`Backend ${provider} login failed: ${responseText}`)
  }

  if (!data.access) {
    throw new Error(`Backend ${provider} login response missing access token`)
  }

  return { accessToken: data.access }
}
