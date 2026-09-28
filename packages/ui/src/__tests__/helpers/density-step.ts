import { type DensityStep, densitySteps, stepDown } from '../../core/density'

const isStep = (value: string | null): value is DensityStep =>
	densitySteps.includes(value as DensityStep)

/**
 * Reads the density step that the stepped classes give `element`, from its
 * `data-density` scopes. jsdom loads no stylesheet, so a unit test reads the
 * scopes as the rungs of `core/density/rungs.ts` do: the nearest scope with a
 * step wins, the element itself included. A control slot
 * (`data-density="slot"`) between the element and that scope takes the step
 * below it, and a slot in a slot counts once. With no scope, the step on the
 * root element applies, and `md` with no step there. `browser/density-scope.test.tsx`
 * checks the rungs against the computed styles.
 */
export function densityStepOf(element: Element): DensityStep {
	let slot = false

	for (let node: Element | null = element; node; node = node.parentElement) {
		const value = node.getAttribute('data-density')

		if (node === document.documentElement) break

		if (value === 'slot') slot = true
		else if (isStep(value)) return slot ? stepDown(value) : value
	}

	const root = document.documentElement.getAttribute('data-density')

	const step = isStep(root) ? root : 'md'

	return slot ? stepDown(step) : step
}
