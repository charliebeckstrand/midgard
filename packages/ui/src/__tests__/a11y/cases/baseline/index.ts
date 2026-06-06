import type { Case } from '../types'
import { contentCases } from './content'
import { dataDisplayCases } from './data-display'
import { feedbackCases } from './feedback'
import { inputCases } from './inputs'
import { navigationCases } from './navigation'

/**
 * Baseline corpus — the canonical, correctly-wired render of each non-overlay
 * component, asserted axe-clean by the gate (`baseline.test.tsx`). Grouped by
 * the REFERENCE.md component categories; add every component here in its
 * canonical, correctly-labelled form as it is verified clean.
 */
export const baseline: readonly Case[] = [
	...contentCases,
	...inputCases,
	...navigationCases,
	...dataDisplayCases,
	...feedbackCases,
]
