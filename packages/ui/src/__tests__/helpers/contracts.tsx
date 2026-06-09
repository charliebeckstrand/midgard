import { createRef, type ReactElement, type RefObject } from 'react'
import { describe, expect, it } from 'vitest'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { renderUI } from './render-ui'
import { bySlot } from './slot-queries'

/**
 * Contract factories — each call registers the `it` blocks for a behavior
 * every size-aware / skeleton-aware / ref-forwarding component must satisfy
 * identically. Components whose behavior deviates from the shared contract
 * (extra wrappers, per-axis density, indirect refs) keep hand-written tests.
 */

type DensityContractOptions = {
	/** Render the component under test; `size` is the explicit prop when defined. */
	render: (size?: Step) => ReactElement
	/** `data-slot` of the element whose recipe class proves which size rendered. */
	slot: string
	/** One class unique to each size variant of the recipe. */
	classFor: Record<Step, string>
}

/**
 * The ambient-density contract: inherit `size` from a surrounding `<Density>`,
 * let an explicit prop win, and fall back to `md` outside any context. Uses
 * the `<Density scale>` primitive directly — the friendly-label mapping of
 * `DensityProvider` is covered once in `providers/density.test.tsx`.
 */
export function describeDensityContract(name: string, options: DensityContractOptions): void {
	const { render, slot, classFor } = options

	describe(name, () => {
		it('inherits size from an ambient Density when no explicit prop is set', () => {
			const { container } = renderUI(<Density scale="sm">{render()}</Density>)

			expect(bySlot(container, slot)?.className).toContain(classFor.sm)
		})

		it('explicit size prop overrides the ambient Density', () => {
			const { container } = renderUI(<Density scale="sm">{render('lg')}</Density>)

			const el = bySlot(container, slot) as HTMLElement

			expect(el.className).toContain(classFor.lg)

			expect(el.className).not.toContain(classFor.sm)
		})

		it('falls back to "md" outside any density context', () => {
			const { container } = renderUI(render())

			expect(bySlot(container, slot)?.className).toContain(classFor.md)
		})
	})
}

/**
 * The skeleton contract: under `SkeletonContext`, the component swaps its
 * real element for a `data-slot="placeholder"` stand-in.
 */
export function itRendersSkeletonPlaceholder(ui: ReactElement, slot: string): void {
	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(ui, { skeleton: true })

		expect(bySlot(container, slot)).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
}

/**
 * The ref contract: a passed ref resolves to the component's host element —
 * the one carrying `slot` when given.
 */
export function itForwardsRef<T extends HTMLElement>(
	render: (ref: RefObject<T | null>) => ReactElement,
	slot?: string,
): void {
	it('forwards ref', () => {
		const ref = createRef<T>()

		const { container } = renderUI(render(ref))

		expect(ref.current).toBeInstanceOf(HTMLElement)

		if (slot) {
			expect(ref.current).toBe(bySlot(container, slot))
		}
	})
}
