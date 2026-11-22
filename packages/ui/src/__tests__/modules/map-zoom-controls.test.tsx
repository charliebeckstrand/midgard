import { describe, expect, it } from 'vitest'
import { bySlot, fireEvent, liveRegion, waitFor } from '../helpers'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * The zoom buttons of a zooming map: the single-pointer path to each scale.
 * They step the view through the same calls as the zoom keys, so these assert
 * the layer transform, the spoken line, and the end of each range.
 */

/** Renders a zooming plat, and returns its zoom buttons by their names. */
function renderControls(extra?: Parameters<typeof categoricalPlat>[0]) {
	const view = renderNavigable(categoricalPlat({ zoom: true, ...extra }))

	const button = (name: string) => view.getByRole('button', { name })

	return {
		...view,
		zoomIn: () => button('Zoom in'),
		zoomOut: () => button('Zoom out'),
		reset: () => button('Reset zoom'),
	}
}

/** The zoom layer's transform. */
function readTransform(container: HTMLElement): string | null | undefined {
	return bySlot(container, 'map-zoom')?.getAttribute('transform')
}

describe('MapZoomControls', () => {
	it('shows a named group of three buttons beside the plot, not in it', () => {
		const { container, plot, getByRole } = renderControls()

		const group = getByRole('group', { name: 'Zoom' })

		expect(group).toHaveAttribute('data-slot', 'map-zoom-controls')

		// The image role makes its descendants presentational.
		expect(plot.contains(group)).toBe(false)

		expect(bySlot(container, 'map-plot-box')).toContainElement(plot)

		expect(group.querySelectorAll('button')).toHaveLength(3)
	})

	it('shows none on a map that does not zoom, and keeps the plain plot box', () => {
		const { container, queryByRole } = renderControls({ zoom: undefined })

		expect(queryByRole('group', { name: 'Zoom' })).toBeNull()

		expect(bySlot(container, 'map-plot-box')).toBeNull()
	})

	it('shows none with `zoomControls={false}`, and the keys still zoom', () => {
		const { container, plot, queryByRole } = renderControls({ zoomControls: false })

		expect(queryByRole('group', { name: 'Zoom' })).toBeNull()

		expect(bySlot(container, 'map-plot-box')).toBeNull()

		fireEvent.keyDown(plot, { key: '+' })

		expect(readTransform(container)).not.toBe('translate(0 0) scale(1)')
	})

	it('steps the scale as the keys do, and speaks the same line', async () => {
		const { container, zoomIn, zoomOut, reset } = renderControls()

		fireEvent.click(zoomIn())

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 160%'))

		expect(readTransform(container)).toContain('scale(1.6)')

		fireEvent.click(zoomIn())

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 256%'))

		fireEvent.click(zoomOut())

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 160%'))

		fireEvent.click(reset())

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom reset'))

		expect(readTransform(container)).toBe('translate(0 0) scale(1)')
	})

	it('marks a button at the end of its range aria-disabled, and drops its press', () => {
		const { container, zoomIn, zoomOut, reset } = renderControls({ zoom: 2 })

		// At the fit, the view can go nowhere but in.
		expect(zoomOut()).toHaveAttribute('aria-disabled', 'true')

		expect(reset()).toHaveAttribute('aria-disabled', 'true')

		expect(zoomIn()).not.toHaveAttribute('aria-disabled')

		fireEvent.click(zoomOut())

		expect(readTransform(container)).toBe('translate(0 0) scale(1)')

		// Two steps of 1.6 pass the ceiling of 2, which clamps the scale.
		fireEvent.click(zoomIn())

		fireEvent.click(zoomIn())

		expect(readTransform(container)).toContain('scale(2)')

		expect(zoomIn()).toHaveAttribute('aria-disabled', 'true')

		expect(zoomOut()).not.toHaveAttribute('aria-disabled')

		expect(reset()).not.toHaveAttribute('aria-disabled')

		// The button keeps the focus at the end of its range: it is not `disabled`.
		expect(zoomIn()).not.toBeDisabled()
	})
})
