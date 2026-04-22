import { forwardRef, useImperativeHandle } from 'react'

const PassthroughFilter = forwardRef((_params, ref) => {
  useImperativeHandle(ref, () => ({ setModel: () => {} }))
  return null
})
PassthroughFilter.displayName = 'PassthroughFilter'

export { PassthroughFilter }
