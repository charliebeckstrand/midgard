'use client'

import { createContext } from '../../core'
import type { Ma } from '../../recipes/ryu/ma'
import type { Step } from '../../recipes/ryu/sun'

/**
 * Narrow `Ma`-typed cascade for slot-context broadcasting, written by
 * surfaces whose descendants need a size value outside the `Step` floor.
 *
 * Two writer shapes today:
 *
 * - **Control affix slots** (`<Input>` prefix / suffix,
 *   `<SelectTrigger>` chevron) broadcast a stepped-down value — `'xs'`
 *   at `'sm'`, `'sm'` at `'md'` — so icons and small buttons inside
 *   the slot render tighter than the host. Use `affixStepDown` below.
 * - **`<Button>`** broadcasts its own resolved size so loading
 *   spinners, prefix / suffix icons, and any other wider-scale-aware
 *   descendants inherit the button's `Ma` size (including `'xs'` and
 *   the prospective `'xl'`, which the `Step`-typed Density cascade
 *   can't carry).
 *
 * Read by wider-scale components (Button, Icon, Spinner) through
 * `useSizeWide`; the universal `useDensity` cascade stays `Step`-typed
 * for everyone else. Returns `null` outside any provider — consumers
 * treat `null` as "fall through to the Density cascade".
 */
const [AffixProvider, useAffix] = createContext<Ma | null>('Affix', { default: null })

const AFFIX_STEP_DOWN: Record<Step, Ma> = { sm: 'xs', md: 'sm', lg: 'md' }

/**
 * Canonical affix step-down: for a host control rendering at the given
 * `Step`, the size to broadcast into its prefix / suffix slot so icons and
 * small buttons render one notch tighter. Goes below the `Step` floor at
 * `'sm'` (returns `'xs'`), which is exactly why the Affix cascade is
 * `Ma`-typed and lives outside Density.
 *
 * Used by `<Input>` and `<SelectTrigger>` (and any future control surface
 * with an affix slot). One canonical map; consumers don't re-roll it.
 */
export function affixStepDown(hostSize: Step): Ma {
	return AFFIX_STEP_DOWN[hostSize]
}

export { AffixProvider, useAffix }
