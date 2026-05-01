import axiosInstance from './axiosInstance'
import type { IsbnLookupResult } from './types'

export function lookupIsbn(isbn: string): Promise<IsbnLookupResult | null> {
  return axiosInstance
    .get<IsbnLookupResult>(`/api/books/isbn/${isbn}`)
    .then(r => (r.status === 204 ? null : r.data))
}
