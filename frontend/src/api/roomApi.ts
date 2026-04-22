import axiosInstance from './axiosInstance'
import type { Page, RoomResponse } from './types'

export function fetchAllRooms(): Promise<RoomResponse[]> {
  return axiosInstance.get<RoomResponse[]>('/api/rooms/all').then(r => r.data)
}

export function fetchRooms(params: {
  page: number
  size: number
  sort: string
  name?: string
}): Promise<Page<RoomResponse>> {
  return axiosInstance.get<Page<RoomResponse>>('/api/rooms', { params }).then(r => r.data)
}

export function deleteRoom(id: string): Promise<void> {
  return axiosInstance.delete(`/api/rooms/${id}`).then(() => undefined)
}
