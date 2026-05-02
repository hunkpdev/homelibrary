import { beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from './axiosInstance'
import { deleteRoom } from './roomApi'

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())

describe('deleteRoom', () => {
  it('resolves to undefined on 204', async () => {
    mock.onDelete('/api/rooms/room-1').reply(204)
    const result = await deleteRoom('room-1')
    expect(result).toBeUndefined()
  })
})
