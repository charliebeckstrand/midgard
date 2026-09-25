import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { frames, renderUI, screen } from '../../helpers'

/**
 * A reposition moves the panel, and the trigger has no part in it.
 *
 * `useFloating` rebuilds its context and its styles on each `autoUpdate` tick.
 * The trigger reads neither, so a context value that carries them renders it
 * again on every tick for nothing. The engine has to run for real here: jsdom
 * lays out nothing, so no tick ever moves the panel.
 */
describe('a Popover reposition (real floating engine)', () => {
	it('moves the panel without rendering the trigger again', async () => {
		let triggerRenders = 0

		// The trigger clones its child with fresh props on each of its renders, so
		// the child counts them.
		function CountingButton(props: ComponentProps<'button'>) {
			triggerRenders++

			return <button type="button" {...props} />
		}

		renderUI(
			// The inset keeps the panel clear of the viewport edge, where the
			// shift middleware would pin its left side in place.
			<div style={{ paddingLeft: 400 }}>
				<Popover defaultOpen>
					<PopoverTrigger>
						<CountingButton>Open</CountingButton>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">
						<div data-testid="body" style={{ width: 100 }}>
							Panel
						</div>
					</PopoverContent>
				</Popover>
			</div>,
		)

		await frames()

		await frames()

		const panel = screen.getByRole('dialog')

		const left = panel.getBoundingClientRect().left

		const settled = triggerRenders

		// A wider panel under a centered `bottom` placement moves its left edge.
		screen.getByTestId('body').style.width = '300px'

		await frames()

		await frames()

		expect(panel.getBoundingClientRect().left).toBeLessThan(left)

		expect(triggerRenders).toBe(settled)
	})
})
