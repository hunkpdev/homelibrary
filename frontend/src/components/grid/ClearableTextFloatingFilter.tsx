import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { IFloatingFilterParams } from 'ag-grid-community'
import { X } from 'lucide-react'

const ClearableTextFloatingFilter = forwardRef<
  { onParentModelChanged: (model: { filter?: string } | null) => void },
  IFloatingFilterParams
>(({ parentFilterInstance }, ref) => {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    onParentModelChanged(model: { filter?: string } | null) {
      setValue(model?.filter ?? '')
    },
  }))

  function applyFilter(text: string) {
    setValue(text)
    parentFilterInstance((instance: { onFloatingFilterChanged: (type: string, value: string | null) => void }) => {
      instance.onFloatingFilterChanged('contains', text || null)
    })
  }

  return (
    <div className="relative flex items-center w-full px-1 py-0.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => applyFilter(e.target.value)}
        className="h-7 w-full rounded-sm border border-input bg-transparent px-2 pr-6 text-xs outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { applyFilter(''); inputRef.current?.focus() }}
          className="absolute right-2 flex items-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})
ClearableTextFloatingFilter.displayName = 'ClearableTextFloatingFilter'

export { ClearableTextFloatingFilter }
