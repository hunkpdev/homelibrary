import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { createBook } from '@/api/bookApi'
import { fetchAllLocations } from '@/api/locationApi'
import type { BookCreateRequest, BookSource, IsbnLookupResult, LocationResponse } from '@/api/types'
import { IsbnLookupPanel } from '@/components/isbn/IsbnLookupPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MutationButton } from '@/components/common/MutationButton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Phase = 'isbn' | 'form'

interface FormFields {
  isbn: string
  title: string
  subtitle: string
  authors: string
  publisher: string
  publishYear: string
  pageCount: string
  language: string
  categories: string
  locationId: string
  description: string
  source: BookSource
}

const EMPTY_FORM: FormFields = {
  isbn: '', title: '', subtitle: '', authors: '',
  publisher: '', publishYear: '', pageCount: '',
  language: '', categories: '', locationId: '',
  description: '', source: 'MANUAL',
}

const FORM_ID = 'book-add-form'

function splitTrim(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

function LabeledField({ label, required, children }: Readonly<{ label: string; required?: boolean; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BookAddModal({ open, onClose, onSuccess }: Readonly<Props>) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('isbn')
  const [fields, setFields] = useState<FormFields>(EMPTY_FORM)
  const [locations, setLocations] = useState<LocationResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPhase('isbn')
      setFields(EMPTY_FORM)
      setError(null)
      fetchAllLocations().then(setLocations).catch(() => {})
    }
  }, [open])

  const handleIsbnResult = (result: IsbnLookupResult | null, isbn: string) => {
    if (result) {
      setFields({
        isbn,
        title: result.title ?? '',
        subtitle: result.subtitle ?? '',
        authors: (result.authors ?? []).join(', '),
        publisher: result.publisher ?? '',
        publishYear: result.publishYear?.toString() ?? '',
        pageCount: result.pageCount?.toString() ?? '',
        language: result.language ?? '',
        categories: '',
        locationId: '',
        description: '',
        source: 'OSZK',
      })
    } else {
      setFields({ ...EMPTY_FORM, isbn, source: 'MANUAL' })
    }
    setPhase('form')
  }

  const setField = (key: keyof FormFields) => (value: string) =>
    setFields(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const payload: BookCreateRequest = {
        isbn: fields.isbn.trim() || undefined,
        title: fields.title.trim(),
        subtitle: fields.subtitle.trim() || undefined,
        authors: splitTrim(fields.authors),
        publisher: fields.publisher.trim() || undefined,
        publishYear: fields.publishYear ? Number.parseInt(fields.publishYear, 10) : undefined,
        pageCount: fields.pageCount ? Number.parseInt(fields.pageCount, 10) : undefined,
        language: fields.language.trim() || undefined,
        categories: splitTrim(fields.categories),
        description: fields.description.trim() || undefined,
        locationId: fields.locationId || undefined,
        source: fields.source,
      }
      await createBook(payload)
      onSuccess()
      onClose()
    } catch {
      setError(t('common.errorUnexpected'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('books.add.title')}</DialogTitle>
        </DialogHeader>

        {phase === 'isbn' ? (
          <>
            <div className="flex flex-col gap-4">
              <IsbnLookupPanel onResult={handleIsbnResult} />
              <Button variant="link" className="self-start p-0 h-auto" onClick={() => setPhase('form')}>
                {t('books.add.manualEntry')}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
              <LabeledField label={t('books.add.titleLabel')} required>
                <Input value={fields.title} onChange={e => setField('title')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.subtitleLabel')}>
                <Input value={fields.subtitle} onChange={e => setField('subtitle')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.isbnLabel')}>
                <Input value={fields.isbn} onChange={e => setField('isbn')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.authorsLabel')}>
                <Input
                  value={fields.authors}
                  onChange={e => setField('authors')(e.target.value)}
                  placeholder={t('books.add.commaSeparated')}
                  disabled={isLoading}
                />
              </LabeledField>
              <LabeledField label={t('books.add.publisherLabel')}>
                <Input value={fields.publisher} onChange={e => setField('publisher')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.publishYearLabel')}>
                <Input type="number" value={fields.publishYear} onChange={e => setField('publishYear')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.pageCountLabel')}>
                <Input type="number" value={fields.pageCount} onChange={e => setField('pageCount')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.languageLabel')}>
                <Input value={fields.language} onChange={e => setField('language')(e.target.value)} disabled={isLoading} />
              </LabeledField>
              <LabeledField label={t('books.add.categoriesLabel')}>
                <Input
                  value={fields.categories}
                  onChange={e => setField('categories')(e.target.value)}
                  placeholder={t('books.add.commaSeparated')}
                  disabled={isLoading}
                />
              </LabeledField>
              <LabeledField label={t('books.add.locationLabel')}>
                <Select value={fields.locationId || undefined} onValueChange={setField('locationId')} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('books.add.locationPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} — {loc.room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <LabeledField label={t('books.add.descriptionLabel')}>
                <Textarea value={fields.description} onChange={e => setField('description')(e.target.value)} rows={3} disabled={isLoading} />
              </LabeledField>
            </form>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <MutationButton
                type="submit"
                form={FORM_ID}
                disabled={isLoading || !fields.title.trim()}
              >
                {isLoading ? t('books.add.saving') : t('books.add.save')}
              </MutationButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
