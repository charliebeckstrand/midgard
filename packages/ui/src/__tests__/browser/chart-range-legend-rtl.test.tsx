import { describe, expect, it } from 'vitest'
import { RangeArrow, RangeLegend } from '../../modules/chart/engine/chart-legend/range-legend'
import { bySlot, getSlot, present, renderUI } from '../helpers'

/**
 * The range bar is physical: the gradient, the pointer math, the thumb, and the
 * arrow run low to high from the left or the bottom. Its end labels must follow
 * the bar and not the inline direction, so in a right-to-left page the minimum
 * label still sits at the minimum end. The heatmap and the choropleth share this
 * bar. The caption keeps the direction of the page. Layout needs the browser.
 */
describe('range legend in a right-to-left page (real browser)', () => {
	const scale = {
		colorRange: ['#f7fee7', '#365314'],
		domain: [0, 100] as [number, number],
		format: (value: number) => `${value}`,
		label: 'Commits',
		bins: 5,
	}

	const labelsOf = (container: HTMLElement) => {
		const track = getSlot(container, 'range-track')

		const texts = [...(track.parentElement?.querySelectorAll('span') ?? [])]

		const find = (text: string) =>
			present(
				texts.find((span) => span.textContent === text),
				text,
			)

		return { track, min: find('0'), max: find('100') }
	}

	it('keeps the minimum label at the left end of a horizontal bar', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 320 }}>
				<RangeLegend {...scale} orientation="horizontal" />
			</div>,
		)

		const { track, min, max } = labelsOf(container)

		const bar = track.getBoundingClientRect()

		expect(Math.abs(min.getBoundingClientRect().left - bar.left)).toBeLessThan(1)
		expect(Math.abs(max.getBoundingClientRect().right - bar.right)).toBeLessThan(1)

		// The caption reads in the direction of the page.
		const caption = present(
			[...container.querySelectorAll('span')].find((span) => span.textContent === 'Commits'),
			'caption',
		)

		expect(getComputedStyle(caption).direction).toBe('rtl')
	})

	it('keeps the labels of a vertical bar clear of its arrow', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 320 }}>
				<RangeLegend
					{...scale}
					orientation="vertical"
					arrow={<RangeArrow value={40} domain={scale.domain} orientation="vertical" />}
				/>
			</div>,
		)

		const { track, min, max } = labelsOf(container)

		const bar = track.getBoundingClientRect()

		const arrow = present(bySlot(container, 'range-arrow'), 'range-arrow').getBoundingClientRect()

		// The arrow hangs off the left edge of the bar, so the labels sit on the right.
		expect(arrow.right).toBeLessThanOrEqual(bar.left)

		for (const label of [min, max]) {
			expect(label.getBoundingClientRect().left).toBeGreaterThanOrEqual(bar.right)
		}

		// The maximum reads at the top, and the minimum at the bottom.
		expect(max.getBoundingClientRect().top).toBeLessThan(min.getBoundingClientRect().top)
	})
})
