import { describe, expect, it } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser check of ReadyReveal's rest hold. Outside a crossfade the
 * inactive layer sleeps in `<Activity mode="hidden">` (`display: none`, CSS
 * animations stopped); flipping `ready` wakes both layers for the crossfade,
 * then rests the deactivated one once its fade-out lands. This needs a real
 * browser — jsdom never completes the Motion fade that sets the rest latch.
 */
describe('ReadyReveal rest hold (real browser)', () => {
	it('rests the inactive layer at mount and swaps the hold after a reveal', async () => {
		const { rerender } = renderUI(
			<ReadyReveal ready={false} placeholder={<span data-testid="p">loading</span>}>
				<span data-testid="c">content</span>
			</ReadyReveal>,
		)

		const layerOf = (testId: string) => {
			const layer = document.querySelector(`[data-testid="${testId}"]`)?.parentElement

			if (!layer) throw new Error(`${testId} layer did not render`)

			return layer
		}

		// Not ready: the content layer rests hidden while the placeholder shows.
		await waitFor(() => expect(getComputedStyle(layerOf('c')).display).toBe('none'))

		expect(getComputedStyle(layerOf('p')).display).not.toBe('none')

		rerender(
			<ReadyReveal ready placeholder={<span data-testid="p">loading</span>}>
				<span data-testid="c">content</span>
			</ReadyReveal>,
		)

		// The reveal wakes the content layer immediately; the placeholder rests
		// once its fade-out lands.
		await waitFor(() => expect(getComputedStyle(layerOf('c')).display).not.toBe('none'))

		await waitFor(() => expect(getComputedStyle(layerOf('p')).display).toBe('none'))
	})
})
