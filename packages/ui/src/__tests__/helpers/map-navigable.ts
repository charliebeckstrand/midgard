import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'
import { renderUI } from './render-ui'
import { bySlot } from './slot-queries'

/** The box a rendered plat's SVG reports, wide enough to give the fit a real aspect. */
const PLOT_BOX = { width: 400, height: 200 } as const

/**
 * Renders a plat and gives its SVG a real box, returning the plot region beside
 * the usual render result.
 *
 * jsdom reports every rect as zero, and a zero box collapses the frame scale —
 * so `frameToClient` resolves no position, the keyboard cursor writes no hover
 * target, and the tooltip can never open. A test asserting on either would pass
 * for the wrong reason without this.
 *
 * @param ui - The plat element to render, fixtures already applied.
 *
 * @throws If the plat drew no SVG or no plot region, which means the assertions
 * that follow would read an empty map rather than a navigable one.
 */
export function renderNavigable(ui: ReactElement): RenderResult & { plot: HTMLElement } {
	const view = renderUI(ui)

	const svg = view.container.querySelector('svg')

	if (svg === null) throw new Error('the plat drew no SVG to navigate')

	vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		right: PLOT_BOX.width,
		bottom: PLOT_BOX.height,
		x: 0,
		y: 0,
		...PLOT_BOX,
		toJSON: () => ({}),
	})

	const plot = bySlot(view.container, 'map-plot')

	if (plot === null) throw new Error('the plat drew no plot region')

	return { ...view, plot }
}
