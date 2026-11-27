import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../../components/toolbar'
import { densitySteps } from '../../../core/density'
import type { Orientation } from '../../../types/orientation'
import { frames, getSlot, renderUI } from '../../helpers'
import { LAYOUT_UNIT } from '../../helpers/geometry/tolerance'
import { holdRoot } from '../helpers/root-state'

/**
 * The hit areas of the buttons of a `Toolbar` tile the toolbar along its axis,
 * as the tabs of a tab list do. The buttons keep their gap, and each point
 * between two buttons activates one of them. Thus the pointer meets no dead
 * space between two buttons, in the toolbar and in a group. A separator
 * marks the end of a cluster, so the space around it is not a hit area.
 *
 * Before, a button at the 24 px floor or over it kept its own box as its hit
 * area, so the gap between two buttons hit the toolbar.
 *
 * Rides the real browser because jsdom lays nothing out.
 */

function Probe({ orientation }: { orientation: Orientation }) {
	return (
		<Toolbar aria-label="Editor" orientation={orientation}>
			<Button variant="plain">a</Button>
			<Button variant="plain">b</Button>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				<Button variant="plain">c</Button>
				<Button variant="plain">d</Button>
				<Button variant="plain">e</Button>
			</ToolbarGroup>
		</Toolbar>
	)
}

describe('Toolbar hit areas along its axis (real browser)', () => {
	it.for(
		(['horizontal', 'vertical'] as const).flatMap((orientation) =>
			densitySteps.map((step) => [orientation, step] as const),
		),
	)('%s at %s', async ([orientation, step]) => {
		holdRoot(step)

		const { container } = renderUI(<Probe orientation={orientation} />)

		await frames()

		const horizontal = orientation === 'horizontal'

		const along = (box: DOMRect) =>
			horizontal ? ([box.left, box.right] as const) : ([box.top, box.bottom] as const)

		const buttons = Array.from(container.querySelectorAll('button'))

		const hosts = buttons.map((button) => along(button.getBoundingClientRect()))

		const areas = buttons.map((button) =>
			along(getSlot(button, 'touch-target').getBoundingClientRect()),
		)

		let pairs = 0

		for (let index = 1; index < buttons.length; index++) {
			// Two buttons on each side of the separator are not neighbors.
			if (buttons[index]?.parentElement !== buttons[index - 1]?.parentElement) continue

			const [, hostEnd] = hosts[index - 1] as readonly [number, number]

			const [hostStart] = hosts[index] as readonly [number, number]

			const [, areaEnd] = areas[index - 1] as readonly [number, number]

			const [areaStart] = areas[index] as readonly [number, number]

			// The buttons keep their space: the hit areas do not move the boxes.
			expect(hostStart).toBeGreaterThanOrEqual(hostEnd)

			// The two hit areas meet, so no point between the two buttons is dead.
			// They do not overlap either.
			expect(areaStart).toBeNear(areaEnd, LAYOUT_UNIT)

			pairs++
		}

		// The pair before the separator, and the two pairs in the group.
		expect(pairs).toBe(3)
	})
})
