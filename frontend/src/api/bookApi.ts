import axiosInstance from './axiosInstance'
import type { BookCreateRequest, BookResponse, Page } from './types'

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

export function createBook(data: BookCreateRequest): Promise<BookResponse> {
  return axiosInstance.post<BookResponse>('/api/books', data).then(r => r.data)
}

export function deleteBook(id: string): Promise<void> {
  return axiosInstance.delete(`/api/books/${id}`).then(() => undefined)
}
