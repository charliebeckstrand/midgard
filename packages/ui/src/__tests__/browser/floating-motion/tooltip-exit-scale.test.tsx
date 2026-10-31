import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'
import { sampleMotionFrames, waitForNoTween } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** The scale of the computed `transform` of `element`. `none` is a scale of 1. */
function readScale(element: Element) {
	const transform = getComputedStyle(element).transform

	return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a
}

/**
 * The scale of `element` in each frame of the Motion frame loop, from the
 * close that `during` sends until the element leaves the document.
 */
async function sampleUntilGone(element: Element, during: () => void) {
	const samples: number[] = []

	await sampleMotionFrames(
		() => {
			if (element.isConnected) samples.push(readScale(element))

			return element.isConnected
		},
		(connected) => !connected,
		{ during: async () => during(), deadline: budget(3000) },
	)

	return samples
}

/**
 * The tooltip panel rests at its full size, and the exit shrinks it to 95%.
 * The exit starts from the rest size. Motion reads a rest of `transform: none`
 * as `scale(0)`, and an exit from there grows the panel from nothing to 95%
 * while it fades.
 *
 * The real engine and real Motion are necessary. The instant Motion mock
 * removes the panel in the commit that closes it, so no exit occurs.
 */
describe('the Tooltip exit (real engine, real Motion)', () => {
	it('shrinks the panel from its full size and not from nothing', async () => {
		renderUI(
			<Tooltip delay={0}>
				<TooltipTrigger>
					<button type="button">Details</button>
				</TooltipTrigger>
				<TooltipContent>More about the details</TooltipContent>
			</Tooltip>,
		)

		await userEvent.keyboard('{Tab}')

		const trigger = screen.getByRole('button', { name: 'Details' })

		await waitFor(() => expect(trigger).toHaveFocus())

		const wrapper = await screen.findByRole('tooltip')

		const panel = present(wrapper.firstElementChild, 'the tooltip panel')

		// The entrance lands.
		await waitForNoTween(() => panel.getAnimations())

		expect(readScale(panel)).toBe(1)

		const scales = await sampleUntilGone(panel, () => fireEvent.keyDown(trigger, { key: 'Escape' }))

		expect(scales.length).toBeGreaterThan(1)

		for (const scale of scales) expect(scale).toBeGreaterThanOrEqual(0.95 - 1e-6)
	})
})
