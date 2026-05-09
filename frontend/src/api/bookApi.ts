import axiosInstance from './axiosInstance'
import type { BookResponse, Page } from './types'

export function fetchBooks(params: {
  page: number
  size: number
  sort: string
  isbn?: string
  title?: string
  authors?: string
  category?: string
  publishYear?: string
}): Promise<Page<BookResponse>> {
  return axiosInstance.get<Page<BookResponse>>('/api/books', { params }).then(r => r.data)
}

export function deleteBook(id: string): Promise<void> {
  return axiosInstance.delete(`/api/books/${id}`).then(() => undefined)
}
