export interface RoomResponse {
  id: string
  name: string
  description: string | null
  locationCount: number
  version: number
}

export interface LocationResponse {
  id: string
  name: string
  description: string | null
  room: RoomResponse
  bookCount: number
  version: number
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
