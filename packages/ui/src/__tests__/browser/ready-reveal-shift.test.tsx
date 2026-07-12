import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { Textarea, TextareaSkeleton } from '../../components/textarea'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser check that toggling `ready` holds the reveal's box to the pixel,
 * whichever way the placeholder is mis-sized. The content layer stays live in
 * flow and the placeholder rides out of flow over it, so the real content sizes
 * the box in both states — a skeleton drawn shorter or taller than the content
 * moves nothing. Two silhouettes bracket both directions: `HeadingSkeleton` is
 * sized to its font, standing shorter than the real `Heading`'s line box;
 * `TextareaSkeleton` stands a couple of pixels taller than the real `Textarea`.
 * jsdom can't measure this — it reports zero-size boxes.
 */
describe('ReadyReveal layout shift (real browser)', () => {
	const rootOf = (container: HTMLElement) => {
		const root = container.querySelector<HTMLElement>('[data-slot="ready-reveal"]')

		if (!root) throw new Error('ready-reveal root did not render')

		return root
	}

	async function measureToggle(loading: React.ReactElement, revealed: React.ReactElement) {
		const view = renderUI(loading)

		const root = rootOf(view.container)

		const loadingHeight = root.getBoundingClientRect().height

		expect(loadingHeight).toBeGreaterThan(0)

		view.rerender(revealed)

		// Let the placeholder rest so only the real content sizes the cell.
		await waitFor(() =>
			expect(getComputedStyle(root.children[0] as HTMLElement).display).toBe('none'),
		)

		return { loadingHeight, revealedHeight: root.getBoundingClientRect().height }
	}

	it('holds the box when the skeleton is shorter than the content', async () => {
		const { loadingHeight, revealedHeight } = await measureToggle(
			<ReadyReveal ready={false} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>,
			<ReadyReveal ready placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>,
		)

		expect(revealedHeight).toBe(loadingHeight)
	})

	it('holds the box when the skeleton is taller than the content', async () => {
		const { loadingHeight, revealedHeight } = await measureToggle(
			<ReadyReveal ready={false} placeholder={<TextareaSkeleton />}>
				<Textarea placeholder="Bio" />
			</ReadyReveal>,
			<ReadyReveal ready placeholder={<TextareaSkeleton />}>
				<Textarea placeholder="Bio" />
			</ReadyReveal>,
		)

		// The taller skeleton must not have inflated the loading box: it already
		// stands at the real Textarea's height, so the reveal holds it.
		expect(revealedHeight).toBe(loadingHeight)
	})
})
