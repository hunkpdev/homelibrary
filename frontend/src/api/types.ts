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

export interface Page<T> {
  content: T[]
  page: {
    totalElements: number
    totalPages: number
    size: number
    number: number
  }
}
