import { createContext } from '../../core'
import type { Step } from '../../recipes/ryu/sun'

/**
 * The active size step in this region of the tree. Provided by `<Concentric>`,
 * `<Group>`, or any wrapper that wants size-aware children to default their
 * `size` prop. Components consume it via `useConcentric()` and use it as a
 * fallback before their kata's `defaultVariants.size`.
 */
export type ConcentricContextValue = {
	size: Step
}

/**
 * Returns the active size context, or `null` outside any size-providing
 * ancestor — components reading this should treat `null` as "no contextual
 * size, use my own default".
 */
export const [ConcentricProvider, useConcentric] = createContext<ConcentricContextValue | null>(
	'Concentric',
	{ default: null },
)
