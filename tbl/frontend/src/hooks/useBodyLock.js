import { useEffect } from 'react'

let lockCount = 0

export function useBodyLock(active = true) {
  useEffect(() => {
    if (!active) return

    lockCount++
    if (lockCount === 1) {
      document.body.classList.add('overflow-hidden')
      document.documentElement.classList.add('overflow-hidden')
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
      document.documentElement.style.overscrollBehavior = 'none'
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.classList.remove('overflow-hidden')
        document.documentElement.classList.remove('overflow-hidden')
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        document.body.style.overscrollBehavior = ''
        document.documentElement.style.overscrollBehavior = ''
      }
    }
  }, [active])
}

export default useBodyLock
