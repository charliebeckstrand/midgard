import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { HashAnchor } from '../../../docs/kit/hash-anchor.tsx'
import { renderUI, screen } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/** The `#` mark of the link: its width and its opacity. */
function readMark(link: HTMLElement) {
	const style = getComputedStyle(link.firstElementChild as HTMLElement)

	return { width: Number.parseFloat(style.width), opacity: Number(style.opacity) }
}

/**
 * Real-Motion check of the hash anchor of a docs heading. Keyboard focus and
 * hover open the slot of the `#` mark and fade the mark in. A blur and a leave
 * hide the mark again.
 */
describe('HashAnchor mark (real Motion)', () => {
	it('shows the mark on keyboard focus, and keeps it out of the name and the text', async () => {
		renderUI(
			<>
				<button type="button">Before</button>
				<h2 id="playground">
					<HashAnchor to="playground">Playground</HashAnchor>
				</h2>
			</>,
		)

		const link = screen.getByRole('link', { name: 'Playground' })

		expect(link.getAttribute('href')).toBe('#playground')
		expect(screen.getByRole('heading').textContent).toBe('Playground')

		await nextPaint()

		expect(readMark(link)).toEqual({ width: 0, opacity: 0 })

		screen.getByRole('button').focus()

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(link)

		await expect.poll(() => readMark(link).opacity).toBe(1)

		expect(readMark(link).width).toBeGreaterThan(0)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })
	})

	it('shows the mark while a mouse hovers the link', async () => {
		renderUI(
			<>
				<button type="button">Before</button>
				<h2 id="playground">
					<HashAnchor to="playground">Playground</HashAnchor>
				</h2>
			</>,
		)

		const link = screen.getByRole('link', { name: 'Playground' })

		await nextPaint()

		await userEvent.hover(link)

		await expect.poll(() => readMark(link).opacity).toBe(1)

		expect(readMark(link).width).toBeGreaterThan(0)

		await userEvent.hover(screen.getByRole('button'))

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })
	})
})
