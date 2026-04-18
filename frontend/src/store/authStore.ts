import { create } from 'zustand'

export type AuthUser = {
  id: string
  username: string
  role: 'ADMIN' | 'VISITOR'
}

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  isInitialized: boolean
  setAuth: (accessToken: string, user: AuthUser) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setInitialized: () => void
}

function decodeAuthUser(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  return {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,

  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitialized: () => set({ isInitialized: true }),
}))

export { decodeAuthUser }
