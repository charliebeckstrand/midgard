import { describe, expect, it } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser check of ReadyReveal's focus rescue. When `ready` flips, the
 * deactivating layer goes `inert` and the browser drops any focus it held to
 * <body>; the primitive should hand that focus to the revealed layer instead.
 * This needs a real browser — jsdom does not model `inert`'s focus behaviour.
 */
describe('ReadyReveal focus rescue (real browser)', () => {
	it('moves focus to the revealed layer when the focused placeholder goes inert', async () => {
		const { container, rerender } = renderUI(
			<ReadyReveal
				ready={false}
				placeholder={
					<button type="button" data-testid="placeholder-action">
						placeholder
					</button>
				}
			>
				<button type="button" data-testid="content-action">
					content
				</button>
			</ReadyReveal>,
		)

		const placeholderAction = container.querySelector<HTMLButtonElement>(
			'[data-testid="placeholder-action"]',
		)

		if (!placeholderAction) throw new Error('placeholder action did not render')

		placeholderAction.focus()

		expect(document.activeElement).toBe(placeholderAction)

		// Flip to ready without a click (a click would move focus off the
		// placeholder itself): the placeholder layer becomes inert.
		rerender(
			<ReadyReveal
				ready
				placeholder={
					<button type="button" data-testid="placeholder-action">
						placeholder
					</button>
				}
			>
				<button type="button" data-testid="content-action">
					content
				</button>
			</ReadyReveal>,
		)

		const contentAction = container.querySelector<HTMLButtonElement>(
			'[data-testid="content-action"]',
		)

		await waitFor(() => expect(document.activeElement).toBe(contentAction))
	})
})
