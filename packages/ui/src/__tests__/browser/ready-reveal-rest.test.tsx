import { describe, expect, it } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser check of ReadyReveal's rest hold. Only the placeholder rests:
 * once the reveal crossfade settles it sleeps in `<Activity mode="hidden">`
 * (`display: none`, skeleton pulse stopped). The content layer stays live in
 * every state so it, not the placeholder, reserves the grid cell's block size —
 * the guarantee that keeps the swap free of layout shift. This needs a real
 * browser — jsdom never completes the Motion fade that sets the rest latch.
 */
describe('ReadyReveal rest hold (real browser)', () => {
	it('keeps the content layer live and rests the placeholder after a reveal', async () => {
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

		// Not ready: the placeholder shows and the content layer stays live in
		// flow (hidden by opacity, never `display: none`) so it reserves the box.
		expect(getComputedStyle(layerOf('p')).display).not.toBe('none')

		expect(getComputedStyle(layerOf('c')).display).not.toBe('none')

		rerender(
			<ReadyReveal ready placeholder={<span data-testid="p">loading</span>}>
				<span data-testid="c">content</span>
			</ReadyReveal>,
		)

		// The reveal leaves the content layer live and rests the placeholder once
		// its fade-out lands.
		await waitFor(() => expect(getComputedStyle(layerOf('p')).display).toBe('none'))

		expect(getComputedStyle(layerOf('c')).display).not.toBe('none')
	})
})
