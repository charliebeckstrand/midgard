import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Drawer, DrawerBody, DrawerPanel } from '../../../components/drawer'
import { frames, getSlot, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { sampleMotionFrames, waitForOverlayRest } from '../helpers/motion-frame'
import { hasIntermediate } from '../helpers/sample'

/**
 * A `fit` drawer travels its height when its content changes in one step. A
 * Collapse moves its own height on each frame. A travel on top of that motion
 * pins the panel to a height that the Collapse passes on the next frame, and the
 * panel then trails the Collapse in a chain of short travels. The panel must
 * follow the Collapse instead.
 *
 * Real Motion is necessary: the instant mock moves no height over frames.
 */

/** The panel and the Collapse panel on one frame. A closed Collapse has no panel. */
type Sample = { panel: number; collapse: number; pinned: boolean }

const read = (panel: HTMLElement): Sample => {
	const collapse = panel.querySelector('[data-slot="collapse-panel"]')

	return {
		panel: panel.getBoundingClientRect().height,
		collapse: collapse === null ? 0 : collapse.getBoundingClientRect().height,
		pinned: panel.style.height !== '',
	}
}

/**
 * Reads each frame, from before the toggle, until the Collapse moved and the
 * panel stands at `to` with no inline height.
 */
async function watch(panel: HTMLElement, to: number): Promise<Sample[]> {
	const samples: Sample[] = []

	await sampleMotionFrames(
		() => {
			const sample = read(panel)

			samples.push(sample)

			return sample
		},
		(sample) =>
			samples.some((each) => each.collapse > 1 && each.collapse < 199) &&
			Math.abs(sample.panel - to) <= HALF_PIXEL &&
			!sample.pinned,
		{ during: () => userEvent.click(screen.getByRole('button', { name: 'More' })) },
	)

	return samples
}

/** A `fit` drawer with a Collapse, and a block that grows in one step. */
function FollowProbe() {
	const [grown, setGrown] = useState(false)

	return (
		<Drawer open onOpenChange={() => {}}>
			<DrawerPanel height="fit" aria-label="Follow">
				<DrawerBody>
					<button type="button" onClick={() => setGrown(true)}>
						Grow
					</button>

					<div style={{ height: grown ? 150 : 0 }} />

					<Collapse>
						<CollapseTrigger>More</CollapseTrigger>

						<CollapsePanel>
							<div style={{ height: 200 }} />
						</CollapsePanel>
					</Collapse>
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}

describe('fit drawer and a Collapse (real Motion)', () => {
	it('follows the Collapse on each frame, with no travel of its own', async () => {
		renderUI(<FollowProbe />)

		const panel = getSlot(document.body, 'drawer')

		// The drawer slides in. A click on a moving button can release off the button.
		await waitForOverlayRest(panel)

		await frames()

		const closed = panel.getBoundingClientRect().height

		for (const to of [closed + 200, closed]) {
			const samples = await watch(panel, to)

			// On each frame the panel holds what the Collapse holds now, and nothing pins it.
			for (const sample of samples) {
				expect(sample.pinned).toBe(false)

				expect(sample.panel - sample.collapse).toBeNear(closed, HALF_PIXEL)
			}
		}

		// The landed Collapse hands the height back: a change in one step travels again.
		const heights: number[] = []

		await sampleMotionFrames(
			() => {
				const height = panel.getBoundingClientRect().height

				heights.push(height)

				return height
			},
			(height) =>
				hasIntermediate(heights, closed, closed + 150) &&
				Math.abs(height - closed - 150) <= HALF_PIXEL,
			{ during: () => userEvent.click(screen.getByRole('button', { name: 'Grow' })) },
		)
	})
})
