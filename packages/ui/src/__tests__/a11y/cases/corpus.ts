import { baseline } from './baseline'
import { interactive } from './interactive'
import { overlays } from './overlays'
import type { Case } from './types'

/**
 * Every axe-gated entry in one list. A sweep that keys on a capability column
 * reads this rather than a single gate's array, so a column works wherever its
 * entry happens to sit: `color picker` lives in `interactive` because its panel
 * needs driving open, which has nothing to do with the skeleton it publishes.
 */
export const corpus: readonly Case[] = [...baseline, ...overlays, ...interactive]
