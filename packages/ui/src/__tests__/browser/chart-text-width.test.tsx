import { describe, expect, it } from 'vitest'
import { useChartTextWidth } from '../../modules/chart/engine/use-chart-text-width'
import { act, getSlot, renderUI, waitFor } from '../helpers'

/**
 * `useChartTextWidth` reads the width that a label renders at, in the font of
 * its host. It measures again when a web font or a stylesheet finishes
 * loading, because each can change every width.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const TEXTS = ['Organic search 42%', 'Direct 26%'] as const

function Probe({
	font = 'monospace',
	className = 'text-sm',
}: {
	font?: string
	className?: string
}) {
	const { width, hostRef } = useChartTextWidth(TEXTS, className, 1)

	return (
		<div ref={hostRef} style={{ fontFamily: font }}>
			<output data-slot="probe-widths">{TEXTS.map(width).join(',')}</output>
		</div>
	)
}

const widths = (container: HTMLElement) =>
	(getSlot(container, 'probe-widths').textContent ?? '').split(',').map(Number)

describe('useChartTextWidth (real browser)', () => {
	it('measures the rendered width in place of the estimate', async () => {
		const { container } = renderUI(<Probe />)

		// The estimate is 1 px for each character, far under any rendered glyph.
		await waitFor(() => {
			const [organic = 0, direct = 0] = widths(container)

			expect(organic).toBeGreaterThan(TEXTS[0].length * 5)

			expect(direct).toBeGreaterThan(TEXTS[1].length * 5)
		})
	})

	it('measures again after a font loads', async () => {
		const { container, rerender } = renderUI(<Probe />)

		await waitFor(() => expect(widths(container)[0]).toBeGreaterThan(TEXTS[0].length))

		const [monospace] = widths(container)

		// A font change alone does not measure again, because the texts did not change.
		rerender(<Probe font="serif" />)

		expect(widths(container)[0]).toBe(monospace)

		// A finished font load does.
		act(() => {
			document.fonts.dispatchEvent(new Event('loadingdone'))
		})

		await waitFor(() => expect(widths(container)[0]).not.toBe(monospace))
	})

	it('measures again after a stylesheet loads', async () => {
		const { container } = renderUI(<Probe className="probe-face" />)

		await waitFor(() => expect(widths(container)[0]).toBeGreaterThan(TEXTS[0].length))

		const [unstyled = 0] = widths(container)

		// The stylesheet that sets the class loads after the first measure, as the
		// full stylesheet of a prerendered page loads after hydration.
		const sheet = document.createElement('link')

		sheet.rel = 'stylesheet'

		sheet.href = 'data:text/css,.probe-face{font-size:40px}'

		document.head.append(sheet)

		try {
			await waitFor(() => expect(widths(container)[0]).toBeGreaterThan(unstyled * 2))
		} finally {
			sheet.remove()
		}
	})
})
