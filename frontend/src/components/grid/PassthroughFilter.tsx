import { forwardRef, useImperativeHandle } from 'react'

// No-op parent filter used when SelectFloatingFilter handles all filter logic.
// AG Grid requires a parent filter instance to exist; we delegate everything to the floating filter.
const PassthroughFilter = forwardRef((_params, ref) => {
  useImperativeHandle(ref, () => ({ setModel: () => {} }))
  return null
})
PassthroughFilter.displayName = 'PassthroughFilter'

export { PassthroughFilter }
