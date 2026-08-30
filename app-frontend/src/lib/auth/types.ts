export type SocialProvider = 'google' | 'facebook' | 'github'

export interface BackendAuthResponse {
  access: string
}

export interface AuthResult {
  accessToken: string
}
