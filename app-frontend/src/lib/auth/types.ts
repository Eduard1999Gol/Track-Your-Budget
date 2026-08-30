export type SocialProvider = 'google' | 'facebook' | 'github'

export interface AuthUser {
  email?: string
  first_name?: string
  last_name?: string
}

export interface BackendAuthResponse {
  access: string
  refresh: string
  user?: AuthUser
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  userName: string
}

export type LoginSuccessHandler = (result: AuthResult) => void
