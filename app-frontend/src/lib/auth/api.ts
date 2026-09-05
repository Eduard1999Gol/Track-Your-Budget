import type {
  AuthResult,
  BackendAuthResponse,
  SocialProvider,
} from './types'

/**
 * Exchanges a provider-issued OAuth credential for a backend access token.
 * The refresh token is delivered by the backend as an httpOnly cookie, so we
 * MUST send credentials to receive/keep it.
 *
 * Backend contract (dj-rest-auth SocialLoginView): POST /api/{provider}/login/
 *   - Google uses the implicit flow, so we forward its `access_token`.
 *   - GitHub and Microsoft only support the authorization-code flow, so we
 *     forward the `code` and the backend exchanges it server-side using its
 *     client secret.
 */
export async function loginWithSocialProvider(
  provider: SocialProvider,
  credential: string,
): Promise<AuthResult> {
  const usesAuthorizationCode = provider === 'github' || provider === 'microsoft'
  const payload = usesAuthorizationCode
    ? { code: credential }
    : { access_token: credential }

  const response = await fetch(`/api/${provider}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()
  let data: BackendAuthResponse | null = null
  if (responseText) {
  try {
    data = JSON.parse(responseText) as BackendAuthResponse
  } catch {
      throw new Error(
        `Invalid JSON from ${provider} auth endpoint (HTTP ${response.status}): ${responseText}`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      `Backend ${provider} login failed (HTTP ${response.status}): ${responseText || '<empty body>'}`,
    )
  }

  if (!data?.access) {
    throw new Error(`Backend ${provider} login response missing access token`)
  }

  return { accessToken: data.access }
}
