'use client'

import { createContext } from '../../core'
import type { Ma, Step } from '../../recipes'

/**
 * Narrow `Ma`-typed cascade for slot-context broadcasting, written by
 * surfaces whose descendants need a size value outside the `Step` floor.
 *
 * Two writer shapes:
 *
 * - **Control affix slots** (`<Input>` prefix / suffix,
 *   `<SelectTrigger>` chevron) broadcast a stepped-down value (`'xs'`
 *   at `'sm'`, `'sm'` at `'md'`), rendering icons and small buttons
 *   one notch tighter than the host. Use `affixStepDown` below.
 * - **`<Button>`** broadcasts its own resolved size: loading spinners,
 *   prefix / suffix icons, and other wider-scale-aware descendants
 *   inherit the button's `Ma` size, including `'xs'` and `'xl'`.
 *
 * Read by wider-scale components (Button, Icon, LoadingSpinner) through
 * `useSize`; the universal `useDensity` cascade stays `Step`-typed
 * for everyone else. Returns `null` outside any provider; consumers
 * treat `null` as "fall through to the Density cascade".
 */
const [AffixContext, useAffix] = createContext<Ma | null>('Affix', { default: null })

const AFFIX_STEP_DOWN: Record<Step, Ma> = { sm: 'xs', md: 'sm', lg: 'md' }

/**
 * Canonical affix step-down: for a host control rendering at the given
 * `Step`, returns the size to broadcast into its prefix / suffix slot,
 * one notch tighter, going below the `Step` floor at `'sm'` (returns
 * `'xs'`). `<Input>` and `<SelectTrigger>` use it.
 */
export function affixStepDown(hostSize: Step): Ma {
	return AFFIX_STEP_DOWN[hostSize]
}

export { AffixContext, useAffix }
