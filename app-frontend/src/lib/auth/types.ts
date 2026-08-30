export type SocialProvider = 'google' | 'facebook' | 'github'

export interface BackendAuthResponse {
  access: string
  refresh: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
}
