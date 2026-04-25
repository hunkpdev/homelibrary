import { create } from 'zustand'

// locationsRefreshTrigger lives here so future location-specific persistent state
// (e.g. last applied filters) has a natural home. If no such state is needed,
// this could be replaced with a local useRefreshTrigger hook (useState-based).
type LocationState = {
  locationsRefreshTrigger: number
  incrementRefreshTrigger: () => void
}

export const useLocationStore = create<LocationState>()(set => ({
  locationsRefreshTrigger: 0,
  incrementRefreshTrigger: () =>
    set(state => ({ locationsRefreshTrigger: state.locationsRefreshTrigger + 1 })),
}))
