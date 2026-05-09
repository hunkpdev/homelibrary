import { create } from 'zustand'

type BookState = {
  booksRefreshTrigger: number
  incrementRefreshTrigger: () => void
}

export const useBookStore = create<BookState>()(set => ({
  booksRefreshTrigger: 0,
  incrementRefreshTrigger: () =>
    set(state => ({ booksRefreshTrigger: state.booksRefreshTrigger + 1 })),
}))
