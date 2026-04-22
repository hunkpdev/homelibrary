import { forwardRef, useImperativeHandle, useState } from 'react'
import type { IFloatingFilterParams } from 'ag-grid-community'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SelectFloatingFilterParams extends IFloatingFilterParams {
  options: { value: string; label: string }[]
  allLabel: string
  onValueChange?: (value: string | null) => void
}

const SelectFloatingFilter = forwardRef<
  { onParentModelChanged: (m: { value: string } | null) => void },
  SelectFloatingFilterParams
>(({ options, allLabel, onValueChange, parentFilterInstance }, ref) => {
  const [value, setValue] = useState<string>('__all__')

  useImperativeHandle(ref, () => ({
    onParentModelChanged(parentModel: { value: string } | null) {
      setValue(parentModel?.value ?? '__all__')
    },
  }))

  function handleChange(selected: string) {
    setValue(selected)
    const model = selected === '__all__' ? null : { value: selected }
    onValueChange?.(selected === '__all__' ? null : selected)
    parentFilterInstance((instance: { setModel: (m: unknown) => void }) => {
      instance.setModel(model)
    })
  }

  return (
    <div className="w-full px-1 py-0.5">
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{allLabel}</SelectItem>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})
SelectFloatingFilter.displayName = 'SelectFloatingFilter'

export { SelectFloatingFilter }
