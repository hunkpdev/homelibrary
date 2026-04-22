import { create } from 'zustand'

type LocationState = {
  locationsRefreshTrigger: number
  incrementRefreshTrigger: () => void
}

export const useLocationStore = create<LocationState>()(set => ({
  locationsRefreshTrigger: 0,
  incrementRefreshTrigger: () =>
    set(state => ({ locationsRefreshTrigger: state.locationsRefreshTrigger + 1 })),
}))
