import { contentCases } from './content'
import { dataComplexCases } from './data-complex'
import { dataDisplayCases } from './data-display'
import { feedbackCases } from './feedback'
import { formCases } from './forms'
import { inputCases } from './inputs'
import { layoutCases } from './layout'
import { navigationCases } from './navigation'
import { specializedCases } from './specialized'
import type { Case } from './types'

/**
 * Baseline corpus — the canonical, correctly-wired render of each non-overlay
 * component, asserted axe-clean by the gate (`baseline.test.tsx`). Grouped by
 * the REFERENCE.md component categories; add every component here in its
 * canonical, correctly-labelled form as it is verified clean.
 */
export const baseline: readonly Case[] = [
	...contentCases,
	...inputCases,
	...formCases,
	...navigationCases,
	...dataDisplayCases,
	...dataComplexCases,
	...layoutCases,
	...feedbackCases,
	...specializedCases,
]
