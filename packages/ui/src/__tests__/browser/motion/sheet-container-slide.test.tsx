import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Sheet, SheetPanel, SheetTitle, SheetTrigger } from '../../../components/sheet'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * A sheet scoped to a container waits outside the box of the container until it
 * slides in. On open, the focus goes to the first control in the panel. If the
 * overflow of the panel reached the container, that move would scroll the
 * container to the panel, and the slide would run against the scroll. In
 * Chromium the scroll cancels the slide, and in WebKit the panel slides out and
 * then jumps back.
 *
 * Real Motion is necessary: the instant mock puts the panel at rest in the
 * commit that opens it, so no overflow occurs. This project mocks Floating UI,
 * so the test moves the focus as the focus manager does: to the first control,
 * with no `preventScroll`.
 */
function Boxed() {
	const [box, setBox] = useState<HTMLDivElement | null>(null)

	return (
		<div ref={setBox} data-testid="box" className="relative h-96 w-80 overflow-hidden">
			<Sheet>
				<SheetTrigger>
					<Button>Show details</Button>
				</SheetTrigger>
				<SheetPanel container={box} width="xs">
					<SheetTitle>brand-guide.pdf</SheetTitle>
				</SheetPanel>
			</Sheet>
		</div>
	)
}

describe('sheet in a container (real Motion)', () => {
	it('slides in without a scroll of the container', async () => {
		renderUI(<Boxed />)

		const box = screen.getByTestId('box')

		const scrolls: number[] = []

		const offsets: number[] = []

		let sampling = true

		const sample = () => {
			if (!sampling) return

			scrolls.push(box.scrollLeft)

			const panel = box.querySelector<HTMLElement>('[data-slot="sheet"]')

			if (panel) {
				offsets.push(panel.getBoundingClientRect().left - box.getBoundingClientRect().left)
			}

			requestAnimationFrame(sample)
		}

		requestAnimationFrame(sample)

		await userEvent.click(screen.getByRole('button', { name: 'Show details' }))

		const panel = getSlot(box, 'sheet')

		screen.getByRole('button', { name: 'Close' }).focus()

		await waitFor(() => expect(getComputedStyle(panel).transform).toBe('none'))

		sampling = false

		expect(Math.max(...scrolls)).toBe(0)

		// The panel came in from outside the box and stopped at its edge: the slide ran.
		expect(Math.max(...offsets)).toBeGreaterThan(0)

		expect(offsets.at(-1)).toBeCloseTo(0)
	})
})
