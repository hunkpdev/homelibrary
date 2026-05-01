import { beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from './axiosInstance'
import { lookupIsbn } from './isbnApi'
import type { IsbnLookupResult } from './types'

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

beforeEach(() => {
  mock.reset()
})

describe('lookupIsbn', () => {
  it('returns IsbnLookupResult on 200', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(200, sampleResult)
    const result = await lookupIsbn('9781234567890')
    expect(result).toEqual(sampleResult)
  })

  it('returns null on 204', async () => {
    mock.onGet('/api/books/isbn/0000000000000').reply(204)
    const result = await lookupIsbn('0000000000000')
    expect(result).toBeNull()
  })

  it('throws on 429', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(429, { reason: 'Daily limit reached' })
    await expect(lookupIsbn('9781234567890')).rejects.toThrow()
  })

  it('throws on 500', async () => {
    mock.onGet('/api/books/isbn/9781234567890').reply(500)
    await expect(lookupIsbn('9781234567890')).rejects.toThrow()
  })
})
