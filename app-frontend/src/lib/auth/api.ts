import type {
  AuthResult,
  BackendAuthResponse,
  SocialProvider,
} from './types'

/**
 * Exchanges a provider-issued token for backend JWT tokens.
 * Backend contract: POST /api/auth/{provider}/  { access_token }
 */
export async function loginWithSocialProvider(
  provider: SocialProvider,
  providerToken: string,
): Promise<AuthResult> {
  const response = await fetch(`/api/auth/${provider}/`, {
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

  const userName =
    [data.user?.first_name, data.user?.last_name].filter(Boolean).join(' ') ||
    data.user?.email ||
    ''

  return {
    accessToken: data.access,
    refreshToken: data.refresh,
    userName,
  }
}
