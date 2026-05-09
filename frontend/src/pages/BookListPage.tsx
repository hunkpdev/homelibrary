import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, IDatasource, IGetRowsParams } from 'ag-grid-community'
import { AllCommunityModule, colorSchemeDark, colorSchemeLight, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AG_GRID_LOCALE_HU } from '@ag-grid-community/locale'
import { deleteBook, fetchBooks } from '@/api/bookApi'
import type { BookResponse } from '@/api/types'
import { useBookStore } from '@/store/bookStore'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { ClearableTextFloatingFilter } from '@/components/grid/ClearableTextFloatingFilter'
import { BookActionCell } from '@/components/books/BookActionCell'
import { BookDetailPanel } from '@/components/books/BookDetailPanel'
import { DeleteModal } from '@/components/ui/DeleteModal'

ModuleRegistry.registerModules([AllCommunityModule])

const PAGE_SIZE = 10

export function BookListPage() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')
  const { booksRefreshTrigger, incrementRefreshTrigger } = useBookStore()

  const gridRef = useRef<AgGridReact<BookResponse>>(null)
  const [selectedBook, setSelectedBook] = useState<BookResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookResponse | undefined>(undefined)

  useEffect(() => {
    if (booksRefreshTrigger > 0) {
      gridRef.current?.api?.purgeInfiniteCache()
    }
  }, [booksRefreshTrigger])

  const datasource: IDatasource = useMemo(() => ({
    getRows(params: IGetRowsParams) {
      const page = Math.floor(params.startRow / PAGE_SIZE)
      const filterModel = params.filterModel as Record<string, { filter?: string }>
      const isbn = filterModel?.isbn?.filter || undefined
      const title = filterModel?.title?.filter || undefined
      const authors = filterModel?.authors?.filter || undefined
      const category = filterModel?.categories?.filter || undefined
      const publishYear = filterModel?.publishYear?.filter || undefined
      const sort = params.sortModel[0]
        ? `${params.sortModel[0].colId},${params.sortModel[0].sort}`
        : 'title,asc'

      fetchBooks({ page, size: PAGE_SIZE, sort, isbn, title, authors, category, publishYear })
        .then(data => params.successCallback(data.content, data.page.totalElements))
        .catch(() => params.failCallback())
    },
  }), [])

  const handleOpenDelete = useCallback((book: BookResponse) => {
    setDeleteTarget(book)
  }, [])

  const handleDeleteSuccess = useCallback(() => {
    incrementRefreshTrigger()
    setSelectedBook(null)
  }, [incrementRefreshTrigger])

  const colDefs = useMemo<ColDef<BookResponse>[]>(() => {
    const textFilterProps = {
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      floatingFilterComponent: ClearableTextFloatingFilter,
      filterParams: { filterOptions: ['contains'], defaultOption: 'contains' },
    }

    const actionCol: ColDef<BookResponse> = {
      colId: 'actions',
      headerName: '',
      field: 'id',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: BookActionCell,
      cellRendererParams: {
        isAdmin,
        isDemo,
        onEdit: () => {},
        onDelete: handleOpenDelete,
        editLabel: t('books.grid.editBook'),
        deleteLabel: t('books.grid.deleteBook'),
      },
    }

    return [
      {
        field: 'isbn',
        headerName: t('books.grid.colIsbn'),
        width: 150,
        ...textFilterProps,
      },
      {
        field: 'title',
        headerName: t('books.grid.colTitle'),
        flex: 2,
        ...textFilterProps,
      },
      {
        field: 'authors',
        headerName: t('books.grid.colAuthors'),
        flex: 2,
        valueFormatter: p => (p.value as string[] | null)?.join('; ') ?? '',
        ...textFilterProps,
      },
      {
        field: 'publishYear',
        headerName: t('books.grid.colPublishYear'),
        width: 130,
        ...textFilterProps,
      },
      {
        field: 'categories',
        headerName: t('books.grid.colCategories'),
        flex: 2,
        sortable: false,
        valueFormatter: p => (p.value as string[] | null)?.join('; ') ?? '',
        ...textFilterProps,
      },
      ...(isAdmin || isDemo ? [actionCol] : []),
    ]
  }, [isAdmin, isDemo, t, handleOpenDelete])

  const gridTheme = useMemo(
    () => themeQuartz.withPart(theme === 'dark' ? colorSchemeDark : colorSchemeLight),
    [theme]
  )

  const gridLocaleText = useMemo(() => {
    const isHungarian = i18n.language?.startsWith('hu')
    return isHungarian ? AG_GRID_LOCALE_HU : {}
  }, [i18n.language])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{t('books.pageTitle')}</h1>
      <div className="w-full" style={{ height: 500 }}>
        <AgGridReact<BookResponse>
          theme={gridTheme}
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: false,
            sortingOrder: ['asc', 'desc', null],
            suppressFloatingFilterButton: true,
            suppressHeaderFilterButton: true,
          }}
          cacheBlockSize={PAGE_SIZE}
          maxBlocksInCache={10}
          pagination={true}
          paginationPageSize={PAGE_SIZE}
          paginationPageSizeSelector={[5, 10, 20]}
          localeText={gridLocaleText}
          onCellClicked={params => {
            if (params.column.getColId() !== 'actions' && params.data) {
              setSelectedBook(params.data)
            }
          }}
        />
      </div>

      <BookDetailPanel
        book={selectedBook}
        open={selectedBook !== null}
        onClose={() => setSelectedBook(null)}
        onDelete={handleOpenDelete}
      />

      <DeleteModal
        open={deleteTarget !== undefined}
        onClose={() => setDeleteTarget(undefined)}
        onSuccess={handleDeleteSuccess}
        onDelete={() => deleteBook(deleteTarget!.id)}
        title={t('books.delete.title')}
        description={t('books.delete.confirm', { title: deleteTarget?.title ?? '' })}
      />
    </div>
  )
}
