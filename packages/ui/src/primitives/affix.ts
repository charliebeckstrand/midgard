'use client'

import { createContext } from '../core'
import type { Ma } from '../recipes/ryu/ma'

/**
 * Narrow `Ma`-typed cascade for slot-context broadcasting, written by
 * surfaces whose descendants need a size value outside the `Step` floor.
 *
 * Two writer shapes today:
 *
 * - **Control affix slots** (`<Input>` prefix / suffix,
 *   `<SelectTrigger>` chevron) broadcast a stepped-down value — `'xs'`
 *   at `'sm'`, `'sm'` at `'md'` — so icons and small buttons inside
 *   the slot render tighter than the host.
 * - **`<Button>`** broadcasts its own resolved size so loading
 *   spinners, prefix / suffix icons, and any other wider-scale-aware
 *   descendants inherit the button's `Ma` size (including `'xs'` and
 *   the prospective `'xl'`, which the `Step`-typed Density cascade
 *   can't carry).
 *
 * Read by wider-scale components (Button, Icon, Spinner) through
 * `useWideSize`; the universal `useDensity` cascade stays `Step`-typed
 * for everyone else. Returns `null` outside any provider — consumers
 * treat `null` as "fall through to the Density cascade".
 */
const [AffixProvider, useAffix] = createContext<Ma | null>('Affix', { default: null })

export { AffixProvider, useAffix }
