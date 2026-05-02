import { beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from './axiosInstance'
import { fetchLocations, deleteLocation } from './locationApi'
import type { LocationResponse, Page } from './types'

const mock = new MockAdapter(axiosInstance)

const room = { id: 'room-1', name: 'Living Room' }
const pageResponse: Page<LocationResponse> = {
  content: [{ id: 'loc-1', name: 'Top Shelf', description: null, room, bookCount: 0, version: 0 }],
  page: { totalElements: 1, totalPages: 1, size: 10, number: 0 },
}

beforeEach(() => mock.reset())

describe('fetchLocations', () => {
  it('returns Page<LocationResponse> on 200', async () => {
    mock.onGet('/api/locations').reply(200, pageResponse)
    const result = await fetchLocations({ page: 0, size: 10, sort: 'name,asc' })
    expect(result).toEqual(pageResponse)
  })

  it('passes optional filter params', async () => {
    mock.onGet('/api/locations').reply(200, pageResponse)
    await fetchLocations({ page: 0, size: 10, sort: 'name,asc', name: 'Shelf', roomId: 'room-1' })
    const req = mock.history.get[0]
    expect(req.params).toMatchObject({ name: 'Shelf', roomId: 'room-1' })
  })
})

describe('deleteLocation', () => {
  it('resolves to undefined on 204', async () => {
    mock.onDelete('/api/locations/loc-1').reply(204)
    const result = await deleteLocation('loc-1')
    expect(result).toBeUndefined()
  })
})
