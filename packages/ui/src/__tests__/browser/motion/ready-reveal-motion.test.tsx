import { describe, expect, it } from 'vitest'
import { ReadyReveal } from '../../../primitives/ready-reveal'
import { renderUI, waitFor } from '../../helpers'

/**
 * Real-Motion check of the ReadyReveal crossfade. The other suites mock
 * `motion/react`, and the mock shows no opacity. These cases wait for the
 * crossfade to land and read the computed style of each layer.
 */
describe('ReadyReveal crossfade (real Motion)', () => {
	const reveal = (ready: boolean) => (
		<ReadyReveal ready={ready} placeholder={<span data-testid="p">loading</span>}>
			<span data-testid="c">content</span>
		</ReadyReveal>
	)

	const layerOf = (testId: string) => {
		const layer = document.querySelector(`[data-testid="${testId}"]`)?.parentElement

		if (!layer) throw new Error(`${testId} layer did not render`)

		return layer
	}

	it('rests the placeholder of a reveal that mounts ready', async () => {
		renderUI(reveal(true))

		await waitFor(() => expect(getComputedStyle(layerOf('p')).display).toBe('none'))

		expect(getComputedStyle(layerOf('c')).opacity).toBe('1')
	})

	it('fades the placeholder in when a reveal that mounted ready clears', async () => {
		const { rerender } = renderUI(reveal(true))

		await waitFor(() => expect(getComputedStyle(layerOf('p')).display).toBe('none'))

		rerender(reveal(false))

		// Before the fix, the placeholder stayed at opacity 0 and the content faded
		// out, so the box showed neither layer.
		await waitFor(() => {
			expect(getComputedStyle(layerOf('p')).opacity).toBe('1')

			expect(getComputedStyle(layerOf('c')).opacity).toBe('0')
		})
	})

	it('fades the placeholder back in after a reveal from unready', async () => {
		const { rerender } = renderUI(reveal(false))

		rerender(reveal(true))

		await waitFor(() => expect(getComputedStyle(layerOf('p')).display).toBe('none'))

		rerender(reveal(false))

		await waitFor(() => {
			expect(getComputedStyle(layerOf('p')).opacity).toBe('1')

			expect(getComputedStyle(layerOf('c')).opacity).toBe('0')
		})
	})
})
