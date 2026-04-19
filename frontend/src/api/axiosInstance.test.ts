import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from './axiosInstance'
import { useAuthStore } from '@/store/authStore'

const mock = new MockAdapter(axiosInstance)

const mockUser = { id: 'uuid-1', username: 'admin', role: 'ADMIN' as const }
const ACCESS_TOKEN = 'access.token'
const NEW_ACCESS_TOKEN = 'new.access.token'

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: false })
  mock.reset()
  // Reset redirect spy
  Object.defineProperty(globalThis, 'location', { value: { href: '' }, writable: true, configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(globalThis, 'location', { value: { href: '' }, writable: true, configurable: true })
})

describe('request interceptor', () => {
  it('adds Authorization header when access token is set', async () => {
    useAuthStore.setState({ accessToken: ACCESS_TOKEN, user: mockUser, isInitialized: true })
    mock.onGet('/api/books').reply(200, [])

    const config = await axiosInstance.get('/api/books').then((r) => r.config)

    expect(config.headers?.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
  })

  it('does not add Authorization header when no access token', async () => {
    mock.onGet('/api/books').reply(200, [])

    const config = await axiosInstance.get('/api/books').then((r) => r.config)

    expect(config.headers?.Authorization).toBeUndefined()
  })
})

describe('response interceptor — 401 handling', () => {
  it('refreshes token and retries original request on 401', async () => {
    useAuthStore.setState({ accessToken: ACCESS_TOKEN, user: mockUser, isInitialized: true })
    mock.onGet('/api/books').replyOnce(401).onGet('/api/books').reply(200, [])
    mock.onPost('/api/auth/refresh').reply(200, { accessToken: NEW_ACCESS_TOKEN })

    await axiosInstance.get('/api/books')

    expect(useAuthStore.getState().accessToken).toBe(NEW_ACCESS_TOKEN)
  })

  it('sends exactly one refresh request when three concurrent 401s arrive', async () => {
    useAuthStore.setState({ accessToken: ACCESS_TOKEN, user: mockUser, isInitialized: true })
    mock.onGet('/api/books').replyOnce(401)
    mock.onGet('/api/books').replyOnce(401)
    mock.onGet('/api/books').replyOnce(401)
    mock.onPost('/api/auth/refresh').reply(200, { accessToken: NEW_ACCESS_TOKEN })
    mock.onGet('/api/books').reply(200, [])

    await Promise.allSettled([
      axiosInstance.get('/api/books'),
      axiosInstance.get('/api/books'),
      axiosInstance.get('/api/books'),
    ])

    const refreshCalls = mock.history.post.filter((r) => r.url?.includes('/api/auth/refresh'))
    expect(refreshCalls).toHaveLength(1)
  })

  it('clears auth and redirects to /login when refresh endpoint returns 401', async () => {
    useAuthStore.setState({ accessToken: ACCESS_TOKEN, user: mockUser, isInitialized: true })
    mock.onGet('/api/books').reply(401)
    mock.onPost('/api/auth/refresh').reply(401)

    await axiosInstance.get('/api/books').catch(() => {})

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(globalThis.location.href).toBe('/login')
  })

  it('does not retry a request that already retried', async () => {
    useAuthStore.setState({ accessToken: ACCESS_TOKEN, user: mockUser, isInitialized: true })
    mock.onGet('/api/books').reply(401)
    mock.onPost('/api/auth/refresh').reply(200, { accessToken: NEW_ACCESS_TOKEN })

    await axiosInstance.get('/api/books').catch(() => {})

    const retryCalls = mock.history.get.filter((r) => r.url?.includes('/api/books'))
    expect(retryCalls.length).toBeLessThanOrEqual(2)
  })
})
