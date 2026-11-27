import { afterAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { renderUI, screen, waitFor } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'
import { hits } from '../helpers/exit'

/**
 * A tooltip that focus opened closes in the task of the blur. The next Tab stop
 * can sit under the panel, as a heading link above a toolbar does. When the
 * panel stayed open until a later task, it took the pointer over the new focus.
 * It covered the focus for a frame or more (WCAG 2.4.11).
 *
 * The case moves the focus with `focus()`, which sends the blur in the same
 * task. React commits the update of the blur in a microtask of that task. The
 * check waits only for those microtasks, so it runs before any later task. A
 * key press is a round trip to the browser process, and the check after it
 * comes too late to see the defect. The real floating engine is necessary,
 * because the close of `useFocus` comes from it. A tooltip mounts in its first
 * state before the idle load, as on a page, or in its full state after the
 * load.
 */

// The last release leaves the module loaded for the files after this one.
afterAll(async () => {
	tooltipLoad.release()

	await tooltipBody.load()
})

/**
 * Renders a link and, under it, a trigger whose tooltip opens above the trigger
 * and covers the link. Focus opens the tooltip.
 */
const openOverLink = vi.defineHelper(async () => {
	renderUI(
		<div style={{ paddingBlockStart: 120, inlineSize: 320 }}>
			<a href="#next" style={{ display: 'block', blockSize: 24 }}>
				Next
			</a>
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Details</button>
				</TooltipTrigger>
				<TooltipContent>More about the details of this control, on two lines</TooltipContent>
			</Tooltip>
		</div>,
	)

	await userEvent.keyboard('{Tab}{Tab}')

	await waitFor(() => expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus())

	tooltipLoad.release()

	await screen.findByRole('tooltip')

	const link = screen.getByRole('link', { name: 'Next' })

	// The layout puts the open panel over the link.
	await waitFor(() => expect(hits(link)).toBe(false))

	return link
})

describe('a tooltip that focus opened, on the blur (real engine)', () => {
	it.for([
		{ state: 'first', hold: true },
		{ state: 'full', hold: false },
	])('closes in the task of the blur in its $state state', async ({ hold }) => {
		if (hold) tooltipLoad.hold()

		const link = await openOverLink()

		link.focus()

		// React commits the update of a focus event in a microtask of the same task.
		await new Promise<void>((resolve) => queueMicrotask(resolve))

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

		expect(hits(link)).toBe(true)
	})
})
