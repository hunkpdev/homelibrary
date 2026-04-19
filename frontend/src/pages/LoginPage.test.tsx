import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { LoginPage } from './LoginPage'

const mock = new MockAdapter(axiosInstance)
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// JWT with payload: { sub: 'uuid-1', username: 'admin', role: 'ADMIN' }
const mockAccessToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'admin', role: 'ADMIN' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: false })
  mock.reset()
  mockNavigate.mockReset()
})

describe('LoginPage', () => {
  it('renders username and password fields', () => {
    renderLoginPage()

    expect(screen.getByLabelText('Felhasználónév')).toBeInTheDocument()
    expect(screen.getByLabelText('Jelszó')).toBeInTheDocument()
  })

  it('successful login calls setAuth and navigates to /', async () => {
    mock.onPost('/api/auth/login').reply(200, { accessToken: mockAccessToken, tokenType: 'Bearer', expiresIn: 900 })
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Felhasználónév'), 'admin')
    await userEvent.type(screen.getByLabelText('Jelszó'), 'password')
    await userEvent.click(screen.getByRole('button', { name: /bejelentkezés/i }))

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe(mockAccessToken)
      expect(useAuthStore.getState().user).toEqual({ id: 'uuid-1', username: 'admin', role: 'ADMIN' })
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error message on 401, no navigation', async () => {
    mock.onPost('/api/auth/login').reply(401)
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Felhasználónév'), 'admin')
    await userEvent.type(screen.getByLabelText('Jelszó'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /bejelentkezés/i }))

    await waitFor(() => {
      expect(screen.getByText('Hibás felhasználónév vagy jelszó')).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('button is disabled while submitting', async () => {
    mock.onPost('/api/auth/login').reply(
      () => new Promise(resolve => setTimeout(() => resolve([200, { accessToken: mockAccessToken }]), 100))
    )
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Felhasználónév'), 'admin')
    await userEvent.type(screen.getByLabelText('Jelszó'), 'password')
    await userEvent.click(screen.getByRole('button', { name: /bejelentkezés/i }))

    expect(screen.getByRole('button')).toBeDisabled()

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})
