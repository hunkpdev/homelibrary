import { beforeEach, describe, expect, it } from 'vitest'
import { decodeAuthUser, useAuthStore } from './authStore'

const mockUser = { id: 'uuid-1', username: 'admin', role: 'ADMIN' as const }

// JWT with payload: { sub: 'uuid-1', username: 'admin', role: 'ADMIN' }
const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'admin', role: 'ADMIN' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: false })
})

describe('setAuth', () => {
  it('sets accessToken and user', () => {
    useAuthStore.getState().setAuth(mockToken, mockUser)

    expect(useAuthStore.getState().accessToken).toBe(mockToken)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })
})

describe('setAccessToken', () => {
  it('updates accessToken but keeps user', () => {
    useAuthStore.setState({ accessToken: 'old-token', user: mockUser })

    useAuthStore.getState().setAccessToken('new-token')

    expect(useAuthStore.getState().accessToken).toBe('new-token')
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })
})

describe('clearAuth', () => {
  it('clears accessToken and user but keeps isInitialized', () => {
    useAuthStore.setState({ accessToken: mockToken, user: mockUser, isInitialized: true })

    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isInitialized).toBe(true)
  })
})

describe('setInitialized', () => {
  it('sets isInitialized to true', () => {
    useAuthStore.getState().setInitialized()

    expect(useAuthStore.getState().isInitialized).toBe(true)
  })
})

describe('decodeAuthUser', () => {
  it('extracts id, username and role from token payload', () => {
    const user = decodeAuthUser(mockToken)

    expect(user.id).toBe('uuid-1')
    expect(user.username).toBe('admin')
    expect(user.role).toBe('ADMIN')
  })
})
