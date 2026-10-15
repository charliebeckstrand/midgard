import { afterEach, describe, expect, it } from 'vitest'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../../components/toolbar'
import type { ToolbarOrientation } from '../../../components/toolbar/types'
import { type DensityStep, densitySteps, writeRootDensity } from '../../../core/density'
import { frames, getSlot, renderUI } from '../../helpers'
import { LAYOUT_UNIT } from '../../helpers/geometry/tolerance'

/**
 * The gap in a toolbar group stays below the toolbar gap at each density step,
 * so a group reads as a group. The separator margin is the toolbar gap.
 *
 * Before, the group gap and the separator margin were fixed (2px and 4px), and
 * only the toolbar gap stepped. At `xs`, the gap in a group was larger than the
 * gap between two groups, and at `sm` the two gaps were equal.
 *
 * Rides the real browser because jsdom lays nothing out.
 */

/** The toolbar gap at each step, in px: the `xs` stop of the gap scale. */
const TOOLBAR_GAP = { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } as const satisfies Record<
	DensityStep,
	number
>

function Probe({ orientation }: { orientation: ToolbarOrientation }) {
	return (
		<Toolbar aria-label="Editor" orientation={orientation}>
			<ToolbarGroup aria-label="a">
				<button type="button" style={{ width: 40, height: 32 }}>
					a1
				</button>
				<button type="button" style={{ width: 40, height: 32 }}>
					a2
				</button>
			</ToolbarGroup>
			<ToolbarGroup aria-label="b">
				<button type="button" style={{ width: 40, height: 32 }}>
					b1
				</button>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="c">
				<button type="button" style={{ width: 40, height: 32 }}>
					c1
				</button>
			</ToolbarGroup>
		</Toolbar>
	)
}

describe('Toolbar group gap at each density step (real browser)', () => {
	afterEach(() => writeRootDensity(document.documentElement, 'md'))

	it.for(
		(['horizontal', 'vertical'] as const).flatMap((orientation) =>
			densitySteps.map((step) => [orientation, step] as const),
		),
	)('%s at %s', async ([orientation, step]) => {
		writeRootDensity(document.documentElement, step)

		const { container } = renderUI(<Probe orientation={orientation} />)

		await frames()

		const horizontal = orientation === 'horizontal'
		const start = (element: Element) => {
			const box = element.getBoundingClientRect()

			return horizontal ? box.left : box.top
		}
		const end = (element: Element) => {
			const box = element.getBoundingClientRect()

			return horizontal ? box.right : box.bottom
		}

		const [a1, a2, b1] = Array.from(container.querySelectorAll('button'))
		const separator = getSlot(container, 'toolbar-separator')

		const inside = start(a2 as Element) - end(a1 as Element)
		const between = start(b1 as Element) - end(a2 as Element)

		expect(between).toBeNear(TOOLBAR_GAP[step], LAYOUT_UNIT)
		expect(inside).toBeLessThan(between)

		const style = getComputedStyle(separator)
		const margin = horizontal
			? [style.marginInlineStart, style.marginInlineEnd]
			: [style.marginBlockStart, style.marginBlockEnd]

		expect(margin.map(Number.parseFloat)).toEqual([TOOLBAR_GAP[step], TOOLBAR_GAP[step]])
	})
})
