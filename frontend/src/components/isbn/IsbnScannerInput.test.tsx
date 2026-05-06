import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IsbnScannerInput } from './IsbnScannerInput'

vi.mock('react-zxing', () => ({
  useZxing: () => ({ ref: { current: null } }),
}))

function setupMediaDevices(mode: 'available' | 'unavailable' | 'undefined') {
  if (mode === 'undefined') {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    return
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      enumerateDevices:
        mode === 'available'
          ? vi.fn().mockResolvedValue([{ kind: 'videoinput', deviceId: '', groupId: '', label: '' }])
          : vi.fn().mockResolvedValue([]),
    },
    configurable: true,
    writable: true,
  })
}

function renderInput(props: Partial<React.ComponentProps<typeof IsbnScannerInput>> = {}) {
  const onScan = vi.fn()
  render(<IsbnScannerInput onScan={onScan} isLoading={false} {...props} />)
  return { onScan }
}

describe('IsbnScannerInput — camera mode', () => {
  it('shows video element when camera is available', async () => {
    setupMediaDevices('available')
    renderInput()
    await waitFor(() => expect(screen.getByTestId('isbn-camera-video')).toBeInTheDocument())
  })

  it('applies opacity-50 class to video when isLoading is true', async () => {
    setupMediaDevices('available')
    renderInput({ isLoading: true })
    await waitFor(() => expect(screen.getByTestId('isbn-camera-video')).toHaveClass('opacity-50'))
  })
})

describe('IsbnScannerInput — text fallback mode', () => {
  it('shows text input when no camera device is found', async () => {
    setupMediaDevices('unavailable')
    renderInput()
    await waitFor(() => expect(screen.getByPlaceholderText('ISBN szám')).toBeInTheDocument())
  })

  it('shows text input when mediaDevices is not available', async () => {
    setupMediaDevices('undefined')
    renderInput()
    await waitFor(() => expect(screen.getByPlaceholderText('ISBN szám')).toBeInTheDocument())
  })

  it('calls onScan when Enter is pressed', async () => {
    setupMediaDevices('unavailable')
    const { onScan } = renderInput()
    await waitFor(() => screen.getByPlaceholderText('ISBN szám'))
    await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '9781234567890{Enter}')
    expect(onScan).toHaveBeenCalledWith('9781234567890')
  })

  it('calls onScan when search button is clicked', async () => {
    setupMediaDevices('unavailable')
    const { onScan } = renderInput()
    await waitFor(() => screen.getByPlaceholderText('ISBN szám'))
    await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '9781234567890')
    await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
    expect(onScan).toHaveBeenCalledWith('9781234567890')
  })

  it('trims whitespace before calling onScan', async () => {
    setupMediaDevices('unavailable')
    const { onScan } = renderInput()
    await waitFor(() => screen.getByPlaceholderText('ISBN szám'))
    await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '  9781234567890  ')
    await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
    expect(onScan).toHaveBeenCalledWith('9781234567890')
  })

  it('does not call onScan for whitespace-only input on Enter', async () => {
    setupMediaDevices('unavailable')
    const { onScan } = renderInput()
    await waitFor(() => screen.getByPlaceholderText('ISBN szám'))
    await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '   {Enter}')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('search button is disabled when input is empty', async () => {
    setupMediaDevices('unavailable')
    renderInput()
    await waitFor(() => screen.getByRole('button', { name: 'Keresés' }))
    expect(screen.getByRole('button', { name: 'Keresés' })).toBeDisabled()
  })

  it('input is disabled when isLoading is true', async () => {
    setupMediaDevices('unavailable')
    renderInput({ isLoading: true })
    await waitFor(() => screen.getByPlaceholderText('ISBN szám'))
    expect(screen.getByPlaceholderText('ISBN szám')).toBeDisabled()
  })

  it('search button is disabled when isLoading is true', async () => {
    setupMediaDevices('unavailable')
    renderInput({ isLoading: true })
    await waitFor(() => screen.getByRole('button', { name: 'Keresés' }))
    expect(screen.getByRole('button', { name: 'Keresés' })).toBeDisabled()
  })
})
