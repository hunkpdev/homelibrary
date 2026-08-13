import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MutationButton } from './MutationButton'
import { useAuthStore } from '@/store/authStore'

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('MutationButton — non-DEMO', () => {
  it('renders a plain, enabled button with no tooltip wrapper', () => {
    render(<MutationButton onClick={vi.fn()}>Delete</MutationButton>)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<MutationButton onClick={onClick}>Delete</MutationButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('MutationButton — DEMO', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: null, isInitialized: true })
  })

  it('renders an aria-disabled button (not natively disabled — stays tappable so touch users can still trigger the tooltip)', () => {
    render(<MutationButton onClick={vi.fn()}>Delete</MutationButton>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not call onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<MutationButton onClick={onClick}>Delete</MutationButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('tapping the button shows the tooltip, which then auto-hides on its own — no hover needed', async () => {
    render(<MutationButton onClick={vi.fn()}>Delete</MutationButton>)
    const button = screen.getByRole('button', { name: 'Delete' })

    // Radix renders tooltip content twice by design — a visible bubble plus a visually-hidden
    // role="tooltip" copy for screen readers — so query by that unique role, not by text.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await userEvent.click(button)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Demo módban ez a művelet nem elérhető')

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(), { timeout: 3000 })
  })

  it('tapping again while the tooltip is still showing keeps it open (resets the auto-hide)', async () => {
    render(<MutationButton onClick={vi.fn()}>Delete</MutationButton>)
    const button = screen.getByRole('button', { name: 'Delete' })

    await userEvent.click(button)
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()

    await userEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('does not bubble the click up to an ancestor handler (e.g. a card-level "open" click)', async () => {
    const onCardOpen = vi.fn()
    render(
      <div onClick={onCardOpen}>
        <MutationButton onClick={vi.fn()}>Delete</MutationButton>
      </div>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onCardOpen).not.toHaveBeenCalled()
  })
})
