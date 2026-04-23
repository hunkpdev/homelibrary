import axiosInstance from './axiosInstance'
import type { RoomResponse } from './types'

export function fetchAllRooms(): Promise<RoomResponse[]> {
  return axiosInstance.get<RoomResponse[]>('/api/rooms/all').then(r => r.data)
}

export function createRoom(data: { name: string; description?: string }): Promise<RoomResponse> {
  return axiosInstance.post<RoomResponse>('/api/rooms', data).then(r => r.data)
}

export function updateRoom(id: string, data: { name: string; description?: string; version: number }): Promise<RoomResponse> {
  return axiosInstance.put<RoomResponse>(`/api/rooms/${id}`, data).then(r => r.data)
}

export function deleteRoom(id: string): Promise<void> {
  return axiosInstance.delete(`/api/rooms/${id}`).then(() => undefined)
}
