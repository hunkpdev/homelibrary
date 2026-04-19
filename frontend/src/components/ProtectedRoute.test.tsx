import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from './ProtectedRoute'

// JWT with payload: { sub: 'uuid-1', username: 'admin', role: 'ADMIN' }
const adminToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'admin', role: 'ADMIN' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

// JWT with payload: { sub: 'uuid-2', username: 'visitor', role: 'VISITOR' }
const visitorToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-2', username: 'visitor', role: 'VISITOR' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

function renderWithRoute(allowedRoles: ('ADMIN' | 'VISITOR')[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/403" element={<div>Forbidden page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: false })
})

describe('ProtectedRoute', () => {
  it('shows loading spinner while not initialized', () => {
    useAuthStore.setState({ isInitialized: false, accessToken: null, user: null })
    renderWithRoute(['ADMIN', 'VISITOR'])

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('redirects to /login when no access token', () => {
    useAuthStore.setState({ isInitialized: true, accessToken: null, user: null })
    renderWithRoute(['ADMIN', 'VISITOR'])

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects to /403 when role is not allowed', () => {
    useAuthStore.setState({
      isInitialized: true,
      accessToken: visitorToken,
      user: { id: 'uuid-2', username: 'visitor', role: 'VISITOR' },
    })
    renderWithRoute(['ADMIN'])

    expect(screen.getByText('Forbidden page')).toBeInTheDocument()
  })

  it('renders outlet when role is allowed', () => {
    useAuthStore.setState({
      isInitialized: true,
      accessToken: adminToken,
      user: { id: 'uuid-1', username: 'admin', role: 'ADMIN' },
    })
    renderWithRoute(['ADMIN', 'VISITOR'])

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
