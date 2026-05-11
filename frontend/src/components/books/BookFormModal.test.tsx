import MockAdapter from "axios-mock-adapter";
import axiosInstance from "@/api/axiosInstance.ts";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import {BookFormModal} from "@/components/books/BookFormModal.tsx";
import userEvent from '@testing-library/user-event'
import {BookResponse} from "@/api/types.ts";

const mock = new MockAdapter(axiosInstance)

const books: BookResponse[] = [
    { id: 'book-1', title: 'Title 1', isbn: null, subtitle: null, authors: ['Author 1'], publisher: 'Publisher 1', publishYear: 1999,
      pageCount: null, language: null, categories: [], description: null, coverImageUrl: null, status: "AT_HOME",
      location: null, source: "MANUAL", version: 0, createdAt: "", updatedAt: ""
    },
    { id: 'book-2', title: 'Szülői generációk harca', isbn: '9789636091996', subtitle: 'hogyan értsük meg magunkat?',
      authors: ['Steigervald Krisztián, Matyus Dóra'], publisher: 'Partvonal', publishYear: 2026, pageCount: null,
      language: null, categories: [], description: null, coverImageUrl: null, status: "AT_HOME",
      location: null, source: "OSZK", version: 0, createdAt: "", updatedAt: ""
    },
]

function renderModal(props: Partial<Parameters<typeof BookFormModal>[0]> = {}) {
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
        <BookFormModal
            open={true}
            onClose={onClose}
            onSuccess={onSuccess}
            {...props}
        />
    )
    return { onClose, onSuccess }
}

beforeEach(() => {
    mock.reset()
})

describe('BookFormModal — create mode - manual entry', () => {
    it('renders with empty isbn, title and description', async () => {
        renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Kézi bevitel' }))
        expect(screen.getByLabelText('Cím*')).toHaveValue('')
        expect(screen.getByLabelText('ISBN')).toHaveValue('')
        expect(screen.getByLabelText('Leírás')).toHaveValue('')
    })

    it('save button is disabled when title is empty', async () => {
        renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Kézi bevitel' }))
        expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
    })

    it('save button is disabled when pageCount is filled but no title given', async () => {
        renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Kézi bevitel' }))
        await userEvent.type(screen.getByLabelText('Oldalszám'), '12')
        expect(screen.getByLabelText('Cím*')).toHaveValue('')
        expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
    })

    it('calls POST /api/books and fires onSuccess + onClose on success', async () => {
        mock.onPost('/api/books').reply(201, { ...books[0] })
        const { onClose, onSuccess } = renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Kézi bevitel' }))
        await userEvent.type(screen.getByLabelText('Cím*'), 'Title 1')
        await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledOnce()
            expect(onClose).toHaveBeenCalledOnce()
        })
        const body = JSON.parse(mock.history.post[0].data)
        expect(body.title).toBe('Title 1')
    })

    it('shows error message on unexpected failure', async () => {
        mock.onPost('/api/books').reply(500)
        renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Kézi bevitel' }))
        await userEvent.type(screen.getByLabelText('Cím*'), 'Title 1')
        await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
        expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
    })
})

describe('BookFormModal — create mode - isbn search result', () => {
    it('search button is disabled when ISBN is empty', async () => {
        renderModal()
        expect(screen.getByPlaceholderText('ISBN szám')).toHaveValue('')
        expect(screen.getByRole('button', { name: 'Keresés' })).toBeDisabled()
    })

    it('show error message and display retry button when \'422 - Invalid ISBN format\' returned from ISBN search', async () => {
        mock.onGet('/api/books/isbn/312415').reply(422)
        renderModal()
        await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '312415')
        await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
        expect(screen.getByText('Váratlan hiba történt')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Újrapróbálkozás' })).toBeInTheDocument()
    })

    it('pre-fills form fields with book data returned from ISBN search', async () => {
        mock.onGet('/api/books/isbn/9789636091996').reply(200, { ...books[1] })
        renderModal()
        await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '9789636091996')
        await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
        expect(screen.getByLabelText('Cím*')).toHaveValue('Szülői generációk harca')
        expect(screen.getByLabelText('Alcím')).toHaveValue('hogyan értsük meg magunkat?')
        expect(screen.getByLabelText('ISBN')).toHaveValue('9789636091996')
        expect(screen.getByLabelText('Szerző(k)')).toHaveValue('Steigervald Krisztián, Matyus Dóra')
        expect(screen.getByLabelText('Kiadó')).toHaveValue('Partvonal')
        expect(screen.getByLabelText('Kiadási év')).toHaveValue(2026)
    })

    it('pre-fills ISBN when \'204 - Book not found\' returned from ISBN search', async () => {
        mock.onGet('/api/books/isbn/9789636091111').reply(204)
        renderModal()
        await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '9789636091111')
        await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
        expect(screen.getByLabelText('Cím*')).toHaveValue('')
        expect(screen.getByLabelText('Alcím')).toHaveValue('')
        expect(screen.getByLabelText('ISBN')).toHaveValue('9789636091111')
        expect(screen.getByLabelText('Szerző(k)')).toHaveValue('')
        expect(screen.getByLabelText('Kiadó')).toHaveValue('')
        expect(screen.getByLabelText('Kiadási év')).toHaveValue(null)
        expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
    })

    it('show error message when \'429 - Demo rate limit exceeded\' returned from ISBN search', async () => {
        const rateLimits: Record<string, string>[] = [{
            'DEMO_SESSION_LIMIT_EXCEEDED': 'Elérted a DEMO keresési limitet',
            'DEMO_DAILY_LIMIT_EXCEEDED': 'Elérted a napi DEMO keresési limitet, holnap újra próbálhatod'
        }]
        renderModal()
        for (const rateLimitsKey in rateLimits[0]) {
            mock.onGet('/api/books/isbn/9789636091996').replyOnce(429, {reason: rateLimitsKey})
            await userEvent.type(screen.getByPlaceholderText('ISBN szám'), '9789636091996')
            await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
            expect(await screen.findByText(rateLimits[0][rateLimitsKey])).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Újrapróbálkozás' })).not.toBeInTheDocument()
            await userEvent.clear(screen.getByPlaceholderText('ISBN szám'))
        }
    })
})

describe('BookFormModal — edit mode', () => {
    it('pre-fills form fields when book data is provided', async () => {
        renderModal({book: books[0]})
        expect(screen.getByLabelText('Cím*')).toHaveValue('Title 1')
        expect(screen.getByLabelText('Szerző(k)')).toHaveValue('Author 1')
        expect(screen.getByLabelText('Kiadó')).toHaveValue('Publisher 1')
        expect(screen.getByLabelText('Kiadási év')).toHaveValue(1999)
    })

    it('PUT request sends original version and onSuccess receives server response', async () => {
        mock.onPut('/api/books/' + books[0].id).reply(200, { ...books[0], version: 1 })
        const { onSuccess } = renderModal({ book: books[0] })
        await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
        await waitFor(() =>
            expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }))
        )
        expect(JSON.parse(mock.history.put[0].data).version).toBe(0)
    })

    it('shows conflict error message on 409 response', async () => {
        mock.onPut('/api/books/' + books[0].id).reply(409)
        renderModal({ book: books[0] })
        await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
        expect(await screen.findByText('A könyv időközben módosult, kérlek töltsd be újra')).toBeInTheDocument()
    })

    it('shows unexpected error message on 500 response', async () => {
        mock.onPut('/api/books/' + books[0].id).reply(500)
        renderModal({ book: books[0] })
        await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
        expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
    })
})
