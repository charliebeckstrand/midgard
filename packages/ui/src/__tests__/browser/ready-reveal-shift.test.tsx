import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser check that toggling `ready` holds the reveal's box to the pixel.
 * `HeadingSkeleton` is sized to its font (shorter), the real `Heading` to its
 * line box (taller); the content layer stays live in flow so the grid cell
 * reserves the taller, real height in both states. Were the content layer
 * rested while loading, the cell would shrink to the skeleton and the reveal
 * would push everything below it down. jsdom can't measure this — it reports
 * zero-size boxes.
 */
describe('ReadyReveal layout shift (real browser)', () => {
	it('reserves the real content height while loading, so a reveal does not shift', async () => {
		const view = renderUI(
			<ReadyReveal ready={false} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>,
		)

		const root = view.container.querySelector<HTMLElement>('[data-slot="ready-reveal"]')

		if (!root) throw new Error('ready-reveal root did not render')

		const loadingHeight = root.getBoundingClientRect().height

		expect(loadingHeight).toBeGreaterThan(0)

		view.rerender(
			<ReadyReveal ready placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>,
		)

		// Let the placeholder rest so only the real heading sizes the cell.
		await waitFor(() => {
			const placeholderLayer = root.children[0] as HTMLElement

			expect(getComputedStyle(placeholderLayer).display).toBe('none')
		})

		const revealedHeight = root.getBoundingClientRect().height

		expect(revealedHeight).toBe(loadingHeight)
	})
})
