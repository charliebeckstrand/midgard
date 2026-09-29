import { type CSSProperties, useRef } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import { bySlot, present, renderUI, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * The frames that the readout must hold its anchor under. Each one except
 * `none` makes the wrapper the containing block of a fixed descendant, and a
 * scale or a zoom also changes the ratio of layout pixels to client pixels.
 */
const FRAMES: Record<string, CSSProperties> = {
	none: {},
	'scale(2)': { transform: 'scale(2)', transformOrigin: '0 0' },
	'scale(0.5)': { transform: 'scale(0.5)', transformOrigin: '0 0' },
	'zoom: 2': { zoom: 2 },
	'translate(40px, 30px)': { transform: 'translate(40px, 30px)' },
}

/** The default gap of `TooltipPointer` between the anchor and the panel. */
const GAP = 12

/** The layout size of the origin, before the frame scales it. */
const ORIGIN = { width: 400, height: 200 }

/** A point in the layout box of the origin, as ChartTooltip sends it. */
const OFFSET = { x: 300, y: 120 }

/** A client point, as the map and the heatmap send it. */
const CLIENT = { x: 500, y: 300 }

/** A wrapper with the frame, which holds the readout and, with `relative`, its origin. */
function Frame({ frame, relative }: { frame: CSSProperties; relative: boolean }) {
	const origin = useRef<HTMLDivElement>(null)

	return (
		<div data-testid="frame" style={{ ...frame, width: 400, marginTop: 100, marginLeft: 50 }}>
			<div ref={origin} data-testid="origin" style={ORIGIN} />

			<TooltipPointer
				open
				point={relative ? OFFSET : CLIENT}
				originRef={relative ? origin : undefined}
				track="point"
			>
				<span>Readout</span>
			</TooltipPointer>
		</div>
	)
}

/** The panel after it opens, and after floating-ui places it. */
async function openPanel() {
	const panel = await waitFor(() => present(bySlot(document.body, 'tooltip-content'), 'tooltip'))

	await pause(50)

	return panel
}

/**
 * A pointer readout inside a transformed ancestor, against the real floating
 * engine. The panel portals out of the ancestor, so the transform must not move
 * it off its anchor. The mocked `browser` instance renders the panel in place
 * and does not position it, so a placement check is only valid in this instance.
 */
describe('pointer readout under a transformed ancestor (real browser)', () => {
	beforeAll(() => page.viewport(1400, 1000))

	it.each(Object.entries(FRAMES))('holds an origin-relative anchor under %s', async (_, frame) => {
		renderUI(<Frame frame={frame} relative />)

		const panel = await openPanel()

		const origin = document.querySelector('[data-testid="origin"]')?.getBoundingClientRect()

		if (!origin) throw new Error('expected the origin to be present')

		const box = panel.getBoundingClientRect()

		expect(panel.closest('[data-testid="frame"]')).toBeNull()

		// The point is in the layout pixels of the origin, so it scales with the frame.
		const scaleX = origin.width / ORIGIN.width

		const scaleY = origin.height / ORIGIN.height

		expect(box.left + box.width / 2).toBeCloseTo(origin.left + OFFSET.x * scaleX, 0)

		expect(box.bottom).toBeCloseTo(origin.top + OFFSET.y * scaleY - GAP, 0)
	})

	it.each(Object.entries(FRAMES))('holds a client anchor under %s', async (_, frame) => {
		renderUI(<Frame frame={frame} relative={false} />)

		const box = (await openPanel()).getBoundingClientRect()

		expect(box.left + box.width / 2).toBeCloseTo(CLIENT.x, 0)

		expect(box.bottom).toBeCloseTo(CLIENT.y - GAP, 0)
	})
})
