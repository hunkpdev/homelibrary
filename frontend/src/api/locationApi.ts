import axiosInstance from './axiosInstance'
import type { LocationResponse, Page } from './types'

export function fetchAllLocations(): Promise<LocationResponse[]> {
  return axiosInstance.get<LocationResponse[]>('/api/locations/all').then(r => r.data)
}

export function fetchLocations(params: {
  page: number
  size: number
  sort: string
  name?: string
  roomId?: string
  description?: string
}): Promise<Page<LocationResponse>> {
  return axiosInstance.get<Page<LocationResponse>>('/api/locations', { params }).then(r => r.data)
}

export function createLocation(data: { name: string; roomId: string; description?: string }): Promise<LocationResponse> {
  return axiosInstance.post<LocationResponse>('/api/locations', data).then(r => r.data)
}

export function updateLocation(id: string, data: { name: string; description?: string; version: number }): Promise<LocationResponse> {
  return axiosInstance.put<LocationResponse>(`/api/locations/${id}`, data).then(r => r.data)
}

export function deleteLocation(id: string): Promise<void> {
  return axiosInstance.delete(`/api/locations/${id}`).then(() => undefined)
}
