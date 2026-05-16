'use client'

import { createContext } from '../core'
import type { Ma } from '../recipes/ryu/ma'

/**
 * Narrow `Ma`-typed cascade for the slot-context step-down: descendants
 * inside a control affix (`<Input>` prefix / suffix, `<SelectTrigger>`
 * chevron) render one notch smaller than the host, and that step often
 * lands below the Density token's `Step` floor (`'xs'` at `'sm'`).
 *
 * Only wider-scale components (Button, Icon, Spinner) consume this; the
 * universal {@link useDensity} cascade stays `Step`-typed for everyone
 * else. The two cascades compose: a Button inside an Input affix reads
 * Affix first, falls through to Density if no affix ancestor is present.
 *
 * Returns `null` outside any affix-providing ancestor — consumers should
 * treat `null` as "no slot context, use the regular Density cascade".
 */
const [AffixProvider, useAffix] = createContext<Ma | null>('Affix', { default: null })

export { AffixProvider, useAffix }
