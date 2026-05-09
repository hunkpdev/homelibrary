export interface RoomResponse {
  id: string
  name: string
  description: string | null
  locationCount: number
  version: number
}

export interface EmbeddedRoomSummary {
  id: string
  name: string
}

export interface LocationResponse {
  id: string
  name: string
  description: string | null
  room: EmbeddedRoomSummary
  bookCount: number
  version: number
}

export type IsbnSource = 'OSZK' | 'MANUAL'

export type BookStatus = 'AT_HOME' | 'LOANED' | 'DELETED'
export type BookSource = 'OSZK' | 'MANUAL'

export interface BookRoomSummary {
  id: string
  name: string
}

export interface BookLocationSummary {
  id: string
  name: string
  room: BookRoomSummary
}

export interface BookResponse {
  id: string
  isbn: string | null
  title: string
  subtitle: string | null
  authors: string[]
  publisher: string | null
  publishYear: number | null
  pageCount: number | null
  language: string | null
  categories: string[]
  description: string | null
  coverImageUrl: string | null
  status: BookStatus
  location: BookLocationSummary | null
  source: BookSource
  version: number
  createdAt: string
  updatedAt: string
}

export interface RateLimitExceededResponse {
  reason: 'DEMO_SESSION_LIMIT_EXCEEDED' | 'DEMO_DAILY_LIMIT_EXCEEDED'
}

export interface IsbnLookupResult {
  isbn: string
  title: string | null
  subtitle: string | null
  authors: string[] | null
  publisher: string | null
  publishYear: number | null
  pageCount: number | null
  language: string | null
  source: IsbnSource
}

export interface BookCreateRequest {
  isbn?: string
  title: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishYear?: number
  pageCount?: number
  language?: string
  categories?: string[]
  description?: string
  locationId?: string
  source: BookSource
}

export interface Page<T> {
  content: T[]
  page: {
    totalElements: number
    totalPages: number
    size: number
    number: number
  }
}
