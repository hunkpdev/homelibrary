import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Szinkron kezdőérték matchMedia-ból: SPA-ban (nincs SSR) ez render közben biztonságosan
  // olvasható, és megelőzi, hogy mobilon az első render asztalinak higgye magát (pl. lazy
  // grid chunk letöltődne, mielőtt az effect átbillentené a kártyás nézetre).
  const [isMobile, setIsMobile] = React.useState(
    () => globalThis.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  )

  React.useEffect(() => {
    const mql = globalThis.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
