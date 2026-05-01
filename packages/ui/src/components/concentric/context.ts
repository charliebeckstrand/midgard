import { createContext, useContext } from 'react'
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

export const ConcentricContext = createContext<ConcentricContextValue | null>(null)

/**
 * Read the active size context. Returns `null` outside any size-providing
 * ancestor — components reading this should treat `null` as "no contextual
 * size, use my own default".
 */
export function useConcentric(): ConcentricContextValue | null {
	return useContext(ConcentricContext)
}
