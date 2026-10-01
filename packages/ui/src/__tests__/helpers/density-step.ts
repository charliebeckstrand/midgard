import { type DensityStep, readRootDensity } from '../../core/density'
import { scopeStepOf } from '../../core/density/steps'

/**
 * Reads the density step that the stepped classes give `element`, from its
 * `data-density` scopes. jsdom loads no stylesheet, so a unit test reads the
 * scopes as the rungs of `core/density/rungs.ts` do (`scopeStepOf`). With no
 * scope, the step on the root element applies, and `md` with no step there.
 * `browser/density-scope.test.tsx` checks the rungs against the computed styles.
 */
export function densityStepOf(element: Element): DensityStep {
	const root = document.documentElement

	return scopeStepOf(element, root, readRootDensity(root))
}
