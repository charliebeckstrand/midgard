import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { getSlot, renderUI, screen, waitFor } from '../helpers'

const pages: PdfViewerPage[] = Array.from({ length: 4 }, (_, index) => ({
	id: String(index),
	src: '',
	label: `Page ${index + 1}`,
	width: 612,
	height: 792,
}))

const isMargin = (event: Event) => (event as TransitionEvent).propertyName.startsWith('margin-')

/**
 * The thumbnail rail rests its contents when its slide lands. A close during the open cancels
 * the open slide and starts the close at once. That cancel is not a landing: the contents stay
 * live until the close sends its `transitionend`, so the rail does not empty while it slides out.
 */
describe('pdf viewer rail slide reversed (real browser)', () => {
	it('keeps the rail contents while a close reverses the open', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<div style={{ width: 600, height: 500 }}>
				<PdfViewer pages={pages} thumbnails="rail" fit="width" className="h-full" />
			</div>,
		)

		const rail = getSlot(container, 'pdf-viewer-sidebar')

		const title = rail.querySelector<HTMLElement>(`[id="${rail.getAttribute('aria-labelledby')}"]`)

		if (!title) throw new Error('rail title did not render')

		const landings: string[] = []

		for (const type of ['transitioncancel', 'transitionend']) {
			rail.addEventListener(type, (event) => {
				if (event.target === rail && isMargin(event)) landings.push(type)
			})
		}

		// The first toggle records a choice, which turns the slide on. Let the close land.
		await user.click(screen.getByRole('button', { name: 'Hide thumbnails' }))

		await waitFor(() => expect(landings).toEqual(['transitionend']))

		landings.length = 0

		const opening = new Promise<Animation>((resolve) => {
			rail.addEventListener('transitionrun', (event) => {
				if (event.target !== rail || !isMargin(event)) return

				const [open] = rail.getAnimations()

				if (open) resolve(open)
			})
		})

		await user.click(screen.getByRole('button', { name: 'Show thumbnails' }))

		// Seek the open to its middle, so the close reverses a slide in flight whatever the speed
		// of the run.
		const open = await opening

		open.currentTime = Number(open.effect?.getComputedTiming().duration) / 2

		await user.click(screen.getByRole('button', { name: 'Hide thumbnails' }))

		// The hide comes from the rest, so it shows which event rested the rail.
		await waitFor(() => expect(getComputedStyle(title).display).toBe('none'))

		expect(landings).toEqual(['transitioncancel', 'transitionend'])
	})
})
