import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import type { IsbnLookupResult } from '@/api/types'
import type { IsbnScannerInputHandle } from './IsbnScannerInput'
import { IsbnLookupPanel } from './IsbnLookupPanel'

vi.mock('./IsbnScannerInput', () => ({
  IsbnScannerInput: React.forwardRef<
    IsbnScannerInputHandle,
    { onScan: (isbn: string) => void; isLoading: boolean }
  >(({ onScan, isLoading }, _ref) => (
    <button onClick={() => onScan('9781234567890')} disabled={isLoading} data-testid="mock-scanner">
      Scan
    </button>
  )),
}))

const mock = new MockAdapter(axiosInstance)

const sampleResult: IsbnLookupResult = {
  isbn: '9781234567890',
  title: 'Clean Code',
  subtitle: null,
  authors: ['Robert C. Martin'],
  publisher: 'Prentice Hall',
  publishYear: 2008,
  pageCount: 431,
  language: 'en',
  source: 'OSZK',
}

function renderPanel() {
  const onResult = vi.fn()
  const onError = vi.fn()
  render(<IsbnLookupPanel onResult={onResult} onError={onError} />)
  return { onResult, onError }
}

beforeEach(() => {
  mock.reset()
})

describe('IsbnLookupPanel — loading', () => {
  it('disables scanner and shows connecting message with spinner while loading', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(() => new Promise(() => {}))
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(screen.getByTestId('mock-scanner')).toBeDisabled()
    expect(screen.getByText('Adatbázishoz csatlakozás…')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})

describe('IsbnLookupPanel — found', () => {
  it('calls onResult with data and isbn on 200', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(200, sampleResult)
    const { onResult } = renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(sampleResult, '9781234567890'))
  })
})

describe('IsbnLookupPanel — not found', () => {
  it('calls onResult with null and isbn on 204', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(204)
    const { onResult } = renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null, '9781234567890'))
  })

  it('shows not-found message on 204', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(204)
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByText('Nem találtuk az adatbázisban, töltsd ki kézzel')).toBeInTheDocument()
  })

  it('shows retry button on not-found', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(204)
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByRole('button', { name: 'Újrapróbálkozás' })).toBeInTheDocument()
  })

  it('retry resets panel and re-enables scanner', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(204)
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))
    await screen.findByRole('button', { name: 'Újrapróbálkozás' })
    await userEvent.click(screen.getByRole('button', { name: 'Újrapróbálkozás' }))

    expect(screen.queryByText('Nem találtuk az adatbázisban, töltsd ki kézzel')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-scanner')).not.toBeDisabled()
  })
})

describe('IsbnLookupPanel — rate limited', () => {
  it('shows daily rate limit message on 429 with daily reason', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'DEMO_DAILY_LIMIT_EXCEEDED' })
    const { onError } = renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByText('Elérted a napi DEMO keresési limitet, holnap újra próbálhatod')).toBeInTheDocument()
    expect(onError).toHaveBeenCalledWith('rate-limited-daily')
  })

  it('shows session rate limit message on 429 with DEMO_SESSION_LIMIT_EXCEEDED', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'DEMO_SESSION_LIMIT_EXCEEDED' })
    const { onError } = renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByText('Elérted a DEMO keresési limitet')).toBeInTheDocument()
    expect(onError).toHaveBeenCalledWith('rate-limited-session')
  })

  it('does not show retry button on 429', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'DEMO_DAILY_LIMIT_EXCEEDED' })
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    await screen.findByText('Elérted a napi DEMO keresési limitet, holnap újra próbálhatod')
    expect(screen.queryByRole('button', { name: 'Újrapróbálkozás' })).not.toBeInTheDocument()
  })
})

describe('IsbnLookupPanel — network error', () => {
  it('shows error message on network failure', async () => {
    mock.onGet('/api/books/isbn/9781234567890').networkError()
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
  })

  it('calls onError with error on network failure', async () => {
    mock.onGet('/api/books/isbn/9781234567890').networkError()
    const { onError } = renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('error'))
  })

  it('shows retry button on network error', async () => {
    mock.onGet('/api/books/isbn/9781234567890').networkError()
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByRole('button', { name: 'Újrapróbálkozás' })).toBeInTheDocument()
  })

  it('retry resets panel after error', async () => {
    mock.onGet('/api/books/isbn/9781234567890').networkError()
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))
    await screen.findByRole('button', { name: 'Újrapróbálkozás' })
    await userEvent.click(screen.getByRole('button', { name: 'Újrapróbálkozás' }))

    expect(screen.queryByText('Váratlan hiba történt')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-scanner')).not.toBeDisabled()
  })
})
