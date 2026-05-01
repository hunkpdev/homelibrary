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

export interface IsbnLookupResult {
  isbn: string
  title: string | null
  subtitle: string | null
  authors: string[] | null
  publisher: string | null
  publishYear: number | null
  pageCount: number | null
  language: string | null
  source: IsbnSource | null
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
