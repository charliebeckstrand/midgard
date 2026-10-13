import { describe, expect, it } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { renderUI, waitFor } from '../helpers'

/**
 * In a right-to-left area, the inline start is the right edge. The browser
 * gives `scrollLeft` as zero at the start and a negative value toward the end.
 * The thumb and the bars follow the reading direction.
 */
describe('ScrollArea in a right-to-left page (real browser)', () => {
	function render(orientation: 'horizontal' | 'vertical') {
		const { container } = renderUI(
			<div dir="rtl" style={{ height: 100, width: 200 }}>
				<ScrollArea orientation={orientation} scrollbar="visible" bare className="h-full">
					<div style={orientation === 'horizontal' ? { width: 800, height: 20 } : { height: 400 }}>
						content
					</div>
				</ScrollArea>
			</div>,
		)

		const viewport = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')

		const thumbs = container.querySelectorAll<HTMLElement>('[data-slot="scroll-area-thumb"]')

		return { viewport, thumb: thumbs[thumbs.length - 1], area: viewport?.parentElement }
	}

	it('starts the horizontal thumb at the right edge and moves it left as the area scrolls', async () => {
		const { viewport, thumb, area } = render('horizontal')

		if (!viewport || !thumb || !area) throw new Error('no scroll area')

		const box = area.getBoundingClientRect()

		await waitFor(() =>
			expect(Math.round(thumb.getBoundingClientRect().right)).toBe(Math.round(box.right)),
		)

		viewport.scrollLeft = -(viewport.scrollWidth - viewport.clientWidth)

		viewport.dispatchEvent(new Event('scroll'))

		await waitFor(() =>
			expect(Math.round(thumb.getBoundingClientRect().left)).toBe(Math.round(box.left)),
		)
	})

	it('puts the vertical bar on the left edge', async () => {
		const { thumb, area } = render('vertical')

		if (!thumb || !area) throw new Error('no scroll area')

		await waitFor(() =>
			expect(Math.round(thumb.getBoundingClientRect().left)).toBe(
				Math.round(area.getBoundingClientRect().left),
			),
		)
	})
})
