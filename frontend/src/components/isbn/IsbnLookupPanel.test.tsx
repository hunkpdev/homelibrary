import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import type { IsbnLookupResult } from '@/api/types'
import { IsbnLookupPanel } from './IsbnLookupPanel'

vi.mock('./IsbnScannerInput', () => ({
  IsbnScannerInput: ({ onScan, isLoading }: { onScan: (isbn: string) => void; isLoading: boolean }) => (
    <button onClick={() => onScan('9781234567890')} disabled={isLoading} data-testid="mock-scanner">
      Scan
    </button>
  ),
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
  render(<IsbnLookupPanel onResult={onResult} />)
  return { onResult }
}

beforeEach(() => {
  mock.reset()
})

describe('IsbnLookupPanel — loading', () => {
  it('disables scanner and shows connecting message while loading', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(() => new Promise(() => {}))
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(screen.getByTestId('mock-scanner')).toBeDisabled()
    expect(screen.getByText('Adatbázishoz csatlakozás…')).toBeInTheDocument()
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
  it('shows rate limit message on 429', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'Daily limit reached' })
    renderPanel()

    await userEvent.click(screen.getByTestId('mock-scanner'))

    expect(await screen.findByText('Elérted a napi DEMO keresési limitet, holnap újra próbálhatod')).toBeInTheDocument()
  })

  it('does not show retry button on 429', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'Daily limit reached' })
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
