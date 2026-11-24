import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Toolbar } from '../../../components/toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { renderUI, screen } from '../../helpers'
import { sampleMotionFrames, waitForNoTween } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** A button with a tooltip whose text is `<name> tip`. */
function Tip({ name }: { name: string }) {
	return (
		<Tooltip delay={0}>
			<TooltipTrigger>
				<button type="button">{name}</button>
			</TooltipTrigger>
			<TooltipContent>{name} tip</TooltipContent>
		</Tooltip>
	)
}

/** The opacity of the panel that holds `text`, or `null` when no panel holds it. */
function readOpacity(text: string): number | null {
	const panel = screen.queryByText(text)

	return panel ? Number(getComputedStyle(panel).opacity) : null
}

/**
 * The opacity of each panel in each frame of the Motion frame loop, from the
 * event that `during` sends until `done` accepts a frame.
 */
async function sampleOpacities(
	texts: readonly string[],
	done: (frame: (number | null)[]) => boolean,
	during: () => Promise<unknown>,
) {
	const samples: (number | null)[][] = []

	await sampleMotionFrames(
		() => {
			const frame = texts.map(readOpacity)

			samples.push(frame)

			return frame
		},
		done,
		{ during, deadline: budget(3000) },
	)

	return samples
}

/** Whether `opacity` is a value between the two ends of a fade. */
const fading = (opacity: number | null | undefined) =>
	typeof opacity === 'number' && opacity > 0 && opacity < 1

/**
 * In a warm `<TooltipGroup>`, the panel of the next tooltip shows with no
 * entrance, and the panel that it replaces goes with no exit. The last close
 * of the group plays the exit.
 *
 * The real engine and real Motion are necessary. The instant Motion mock shows
 * and removes each panel at once, with a group or without one.
 */
describe('the motion of a tooltip group (real engine, real Motion)', () => {
	it('swaps the panels of two siblings with no fade, and fades the last close', async () => {
		renderUI(
			<div className="flex flex-col items-start gap-20 p-10">
				<Toolbar aria-label="Format" className="w-fit">
					<Tip name="Bold" />
					<Tip name="Italic" />
				</Toolbar>
				<p>Away</p>
			</div>,
		)

		await userEvent.hover(screen.getByRole('button', { name: 'Bold' }))

		const bold = await screen.findByText('Bold tip')

		// The first tooltip of the group plays its entrance.
		await waitForNoTween(() => bold.getAnimations())

		const swap = await sampleOpacities(
			['Bold tip', 'Italic tip'],
			([gone, shown]) => gone === null && shown !== null,
			() => userEvent.hover(screen.getByRole('button', { name: 'Italic' })),
		)

		for (const [gone, shown] of swap) {
			expect(fading(gone)).toBe(false)

			expect(fading(shown)).toBe(false)
		}

		const close = await sampleOpacities(
			['Italic tip'],
			([shown]) => shown === null,
			() => userEvent.hover(screen.getByText('Away')),
		)

		expect(close.some(([shown]) => fading(shown))).toBe(true)
	})
})
