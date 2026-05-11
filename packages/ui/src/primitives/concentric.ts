import { createContext } from '../core'
import type { Step } from '../recipes/ryu/sun'

/**
 * Top-level ambient size cascade. Provided by `<Card>`, `<Group>`,
 * `<Drawer>`, `<Popover>`, and any future surface that wants size-aware
 * descendants to default their `size` prop.
 *
 * Read by form fields and concentric participants as a fallback before
 * the component's own default. See `src/docs/CASCADES.md` for the full chain.
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
