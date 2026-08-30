import type {
  AuthResult,
  BackendAuthResponse,
  SocialProvider,
} from './types'

/**
 * Exchanges a provider-issued OAuth access token for backend JWT tokens.
 * Backend contract (dj-rest-auth SocialLoginView): POST /api/{provider}/login/  { access_token }
 */
export async function loginWithSocialProvider(
  provider: SocialProvider,
  providerToken: string,
): Promise<AuthResult> {
  const response = await fetch(`/api/${provider}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  if (!data.access || !data.refresh) {
    throw new Error(`Backend ${provider} login response missing JWT tokens`)
  }

  return {
    accessToken: data.access,
    refreshToken: data.refresh,
  }
}
